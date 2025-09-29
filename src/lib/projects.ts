import { ObjectId, Document } from "mongodb";
import { getDb } from "./mongodb";
import { Project } from "./types";

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
  return { ...toInsert, _id: String(res.insertedId), createdAt: now.toISOString(), updatedAt: now.toISOString() };
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


