import { ObjectId, Document } from "mongodb";
import { getDb } from "./mongodb";
import { Project } from "./types";
import { addFileReference, removeFileReference, deleteFileIfOrphaned } from "./gridfs";

const COLLECTION = "projects";

export async function listProjects(limit = 24, skip = 0): Promise<Project[]> {
  const db = await getDb();
  const cursor = db
    .collection<Project>(COLLECTION)
    .find({ isPublished: { $ne: false } })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);
  const docs = await cursor.toArray();
  return docs.map(serializeProject);
}

export async function getAdjacentProjects(id: string) {
  const db = await getDb();
  const projects = db.collection<Project>(COLLECTION);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current = await projects.findOne({ _id: new ObjectId(id) } as any);
  if (!current) return { prev: null, next: null };
  
  // Get all published projects sorted by creation date (oldest first)
  const allProjects = await projects
    .find({ isPublished: { $ne: false } })
    .sort({ createdAt: 1 })
    .project({ _id: 1, createdAt: 1 })
    .toArray();
  
  const currentIndex = allProjects.findIndex(p => p._id?.toString() === id);
  if (currentIndex === -1) return { prev: null, next: null };
  
  const prev = currentIndex > 0 ? allProjects[currentIndex - 1] : null;
  const next = currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null;
  
  return { 
    prev: prev?._id ? String(prev._id) : null, 
    next: next?._id ? String(next._id) : null 
  };
}

export async function getProjectById(id: string): Promise<Project | null> {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await db.collection<Project>(COLLECTION).findOne({ _id: new ObjectId(id) } as any);
  return doc ? serializeProject(doc) : null;
}

export async function createProject(input: Project): Promise<Project> {
  const db = await getDb();
  const now = new Date();
  const toInsert = {
    ...input,
    isPublished: input.isPublished ?? true,
    createdAt: now, // Store as Date object instead of string
    updatedAt: now,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const res = await db.collection<Project>(COLLECTION).insertOne(toInsert);
  const projectId = String(res.insertedId);
  
  // Track file references - extract fileId from URLs
  if (input.poster && input.poster.startsWith("/api/media/")) {
    const fileId = input.poster.replace("/api/media/", "");
    await addFileReference(fileId, projectId, "project_poster");
  }
  if (input.thumbnail && input.thumbnail.startsWith("/api/media/")) {
    const fileId = input.thumbnail.replace("/api/media/", "");
    await addFileReference(fileId, projectId, "project_thumbnail");
  }
  if (input.showcasePhotos) {
    for (const photoUrl of input.showcasePhotos) {
      if (photoUrl.startsWith("/api/media/")) {
        const fileId = photoUrl.replace("/api/media/", "");
        await addFileReference(fileId, projectId, "project_showcase");
      }
    }
  }
  
  return { ...toInsert, _id: projectId, createdAt: now.toISOString(), updatedAt: now.toISOString() };
}

// Update project
export async function updateProject(id: string, input: Partial<Project>): Promise<Project | null> {
  const db = await getDb();
  
  // Get existing project to compare file changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await db.collection<Project>(COLLECTION).findOne({ _id: new ObjectId(id) } as any);
  if (!existing) return null;
  
  const now = new Date();
  const toUpdate = {
    ...input,
    updatedAt: now.toISOString(),
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.collection<Project>(COLLECTION).findOneAndUpdate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { _id: new ObjectId(id) } as any,
    { $set: toUpdate },
    { returnDocument: "after" }
  );
  
  if (!result) return null;
  
  // Handle file reference updates
  // Poster
  if (input.poster !== undefined) {
    if (existing.poster && existing.poster !== input.poster && existing.poster.startsWith("/api/media/")) {
      const oldFileId = existing.poster.replace("/api/media/", "");
      await removeFileReference(oldFileId, id, "project_poster");
      await deleteFileIfOrphaned(oldFileId);
    }
    if (input.poster && input.poster.startsWith("/api/media/")) {
      const newFileId = input.poster.replace("/api/media/", "");
      await addFileReference(newFileId, id, "project_poster");
    }
  }
  
  // Thumbnail
  if (input.thumbnail !== undefined) {
    if (existing.thumbnail && existing.thumbnail !== input.thumbnail && existing.thumbnail.startsWith("/api/media/")) {
      const oldFileId = existing.thumbnail.replace("/api/media/", "");
      await removeFileReference(oldFileId, id, "project_thumbnail");
      await deleteFileIfOrphaned(oldFileId);
    }
    if (input.thumbnail && input.thumbnail.startsWith("/api/media/")) {
      const newFileId = input.thumbnail.replace("/api/media/", "");
      await addFileReference(newFileId, id, "project_thumbnail");
    }
  }
  
  // Showcase photos
  if (input.showcasePhotos !== undefined) {
    const oldPhotos = existing.showcasePhotos || [];
    const newPhotos = input.showcasePhotos || [];
    
    // Remove references to deleted photos
    for (const oldPhoto of oldPhotos) {
      if (!newPhotos.includes(oldPhoto) && oldPhoto.startsWith("/api/media/")) {
        const fileId = oldPhoto.replace("/api/media/", "");
        await removeFileReference(fileId, id, "project_showcase");
        await deleteFileIfOrphaned(fileId);
      }
    }
    
    // Add references to new photos
    for (const newPhoto of newPhotos) {
      if (!oldPhotos.includes(newPhoto) && newPhoto.startsWith("/api/media/")) {
        const fileId = newPhoto.replace("/api/media/", "");
        await addFileReference(fileId, id, "project_showcase");
      }
    }
  }
  
  return serializeProject(result);
}

// Delete project
export async function deleteProject(id: string): Promise<boolean> {
  const db = await getDb();
  
  // Get project to cleanup files
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = await db.collection<Project>(COLLECTION).findOne({ _id: new ObjectId(id) } as any);
  if (!project) return false;
  
  // Delete the project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.collection<Project>(COLLECTION).deleteOne({ _id: new ObjectId(id) } as any);
  
  if (result.deletedCount > 0) {
    // Remove file references and cleanup
    if (project.poster && project.poster.startsWith("/api/media/")) {
      const fileId = project.poster.replace("/api/media/", "");
      await removeFileReference(fileId, id, "project_poster");
      await deleteFileIfOrphaned(fileId);
    }
    if (project.thumbnail && project.thumbnail.startsWith("/api/media/")) {
      const fileId = project.thumbnail.replace("/api/media/", "");
      await removeFileReference(fileId, id, "project_thumbnail");
      await deleteFileIfOrphaned(fileId);
    }
    if (project.showcasePhotos) {
      for (const photoUrl of project.showcasePhotos) {
        if (photoUrl.startsWith("/api/media/")) {
          const fileId = photoUrl.replace("/api/media/", "");
          await removeFileReference(fileId, id, "project_showcase");
          await deleteFileIfOrphaned(fileId);
        }
      }
    }
    return true;
  }
  
  return false;
}

function serializeProject(doc: Document): Project {
  const mongoId = doc?._id;
  let idString: string | undefined = undefined;
  if (mongoId instanceof ObjectId) idString = mongoId.toHexString();
  else if (typeof mongoId === "string") idString = mongoId;

  // Never allow _id to be updated
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id: _, ...rest } = doc ?? {};
  
  // Convert Date objects to ISO strings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialized = { _id: idString, ...(rest as Omit<Project, "_id">) } as any;
  if (serialized.createdAt instanceof Date) {
    serialized.createdAt = serialized.createdAt.toISOString();
  }
  if (serialized.updatedAt instanceof Date) {
    serialized.updatedAt = serialized.updatedAt.toISOString();
  }
  
  return serialized;
}


