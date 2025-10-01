/**
 * MongoDB Change Stream Watcher for Automatic File Cleanup
 * 
 * This watches the file_references collection for deletions.
 * When the last reference to a file is deleted, it automatically deletes the file from GridFS.
 * 
 * This is the closest thing to "database-level deletion" in MongoDB.
 */

import { getDb } from './mongodb';
import { getBucket } from './gridfs';
import { ObjectId } from 'mongodb';

const FILE_REFS_COLLECTION = 'file_references';

export async function startFileCleanupWatcher() {
  const db = await getDb();
  const bucket = await getBucket();
  const collection = db.collection(FILE_REFS_COLLECTION);
  
  console.log('🔍 Starting file cleanup watcher...');
  
  // Watch for DELETE operations on file_references
  const changeStream = collection.watch([
    { $match: { operationType: 'delete' } }
  ]);
  
  changeStream.on('change', async (change) => {
    if (change.operationType === 'delete') {
      // Get the deleted document's fileId
      const deletedDoc = change.documentKey;
      
      // We need to check if this was the last reference to the file
      // But we don't have the fileId from documentKey alone...
      // We need to query before deletion or use fullDocument
      
      console.log('⚠️ Reference deleted, checking for orphaned files...');
      
      // Trigger cleanup check for all files
      await checkAndDeleteOrphanedFiles();
    }
  });
  
  changeStream.on('error', (error) => {
    console.error('❌ Change stream error:', error);
  });
  
  return changeStream;
}

async function checkAndDeleteOrphanedFiles() {
  const db = await getDb();
  const bucket = await getBucket();
  
  // Get all unique fileIds from references
  const referencedFiles = await db.collection(FILE_REFS_COLLECTION)
    .distinct('fileId');
  
  const referencedSet = new Set(referencedFiles);
  
  // Get all files in GridFS
  const allFiles = await bucket.find().toArray();
  
  // Delete files that have no references
  for (const file of allFiles) {
    const fileId = file._id.toString();
    
    if (!referencedSet.has(fileId)) {
      try {
        await bucket.delete(new ObjectId(fileId));
        console.log(`🗑️  Deleted orphaned file: ${fileId}`);
      } catch (error) {
        console.error(`❌ Failed to delete file ${fileId}:`, error);
      }
    }
  }
}

// Note: This needs to run in a long-running process (not serverless)
// For Next.js, you'd need a separate Node.js process or use Vercel Cron Jobs
