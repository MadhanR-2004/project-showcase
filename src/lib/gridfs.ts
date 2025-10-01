import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export async function getBucket() {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: "media" });
}

export function toObjectId(id: string) {
  return new ObjectId(id);
}

// Track file references in a separate collection
const FILE_REFS_COLLECTION = "file_references";

export interface FileReference {
  fileId: string;
  referencedBy: string; // project ID, user ID, etc.
  referenceType: "project_poster" | "project_thumbnail" | "project_showcase" | "user_avatar" | "user_profile";
  createdAt: Date;
}

// Add a reference to a file
export async function addFileReference(fileId: string, referencedBy: string, referenceType: FileReference["referenceType"]) {
  const db = await getDb();
  // Use updateOne with upsert to avoid duplicate key errors
  await db.collection<FileReference>(FILE_REFS_COLLECTION).updateOne(
    {
      fileId,
      referencedBy,
      referenceType,
    },
    {
      $setOnInsert: {
        fileId,
        referencedBy,
        referenceType,
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
}

// Remove a reference to a file
export async function removeFileReference(fileId: string, referencedBy: string, referenceType: FileReference["referenceType"]) {
  const db = await getDb();
  await db.collection<FileReference>(FILE_REFS_COLLECTION).deleteOne({
    fileId,
    referencedBy,
    referenceType
  });
}

// Check if file has any references
export async function hasFileReferences(fileId: string): Promise<boolean> {
  const db = await getDb();
  const count = await db.collection<FileReference>(FILE_REFS_COLLECTION).countDocuments({ fileId });
  return count > 0;
}

// Delete file if it has no references
export async function deleteFileIfOrphaned(fileId: string): Promise<boolean> {
  const hasRefs = await hasFileReferences(fileId);
  if (!hasRefs) {
    const bucket = await getBucket();
    try {
      // Check if file exists before attempting to delete
      const files = await bucket.find({ _id: toObjectId(fileId) }).toArray();
      if (files.length === 0) {
        console.log(`File ${fileId} already deleted, skipping cleanup`);
        return false;
      }
      
      await bucket.delete(toObjectId(fileId));
      console.log(`Deleted orphaned file: ${fileId}`);
      return true;
    } catch (err) {
      // Handle "file not found" error gracefully
      if (err instanceof Error && err.message.includes('File not found')) {
        console.log(`File ${fileId} already deleted, skipping cleanup`);
        return false;
      }
      console.error(`Failed to delete orphaned file ${fileId}:`, err);
      return false;
    }
  }
  return false;
}

// Cleanup orphaned files (run periodically or after operations)
export async function cleanupOrphanedFiles() {
  const bucket = await getBucket();
  const db = await getDb();
  
  // Get all files in GridFS
  const files = await bucket.find({}).toArray();
  const fileIds = files.map(f => String(f._id));
  
  // Check each file for references
  let deletedCount = 0;
  for (const fileId of fileIds) {
    const hasRefs = await hasFileReferences(fileId);
    if (!hasRefs) {
      try {
        await bucket.delete(toObjectId(fileId));
        deletedCount++;
        console.log(`Cleanup: Deleted orphaned file ${fileId}`);
      } catch (err) {
        console.error(`Cleanup: Failed to delete file ${fileId}:`, err);
      }
    }
  }
  
  // Also cleanup references to non-existent files
  const allRefs = await db.collection<FileReference>(FILE_REFS_COLLECTION).find({}).toArray();
  for (const ref of allRefs) {
    if (!fileIds.includes(ref.fileId)) {
      await db.collection<FileReference>(FILE_REFS_COLLECTION).deleteOne({ _id: ref._id });
      console.log(`Cleanup: Removed stale reference for file ${ref.fileId}`);
    }
  }
  
  return { deletedFiles: deletedCount };
}


