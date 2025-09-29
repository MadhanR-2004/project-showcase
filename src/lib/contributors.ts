export async function getContributorById(id: string) {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: new (await import("mongodb")).ObjectId(id) });
  return doc ? serialize(doc) : null;
}
import { getDb } from "./mongodb";
import { Document } from "mongodb";

export interface ContributorDoc {
  _id?: string;
  name: string;
  email: string;
  contributorType?: "student" | "staff";
  branch?: "IT" | "ADS";
  staffTitle?: string;
  yearOfPassing?: string;
  avatarUrl?: string;
  profileUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION = "contributors";

function serialize(doc: Document): ContributorDoc {
  const { _id, ...rest } = doc ?? {};
  return { _id: _id ? String(_id) : undefined, ...(rest as Omit<ContributorDoc, "_id">) };
}

export async function listContributors(): Promise<ContributorDoc[]> {
  const db = await getDb();
  const docs = await db.collection(COLLECTION).find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(serialize);
}

export async function createContributor(input: Omit<ContributorDoc, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc = { ...input, createdAt: now, updatedAt: now };
  const res = await db.collection(COLLECTION).insertOne(doc);
  return { ...doc, _id: String(res.insertedId) } as ContributorDoc;
}

export async function updateContributor(id: string, input: Partial<ContributorDoc>) {
  const db = await getDb();
  input.updatedAt = new Date().toISOString();
  // Never allow _id to be updated
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id: _, ...rest } = input;
  
  // If avatarUrl or profileUrl are not provided, remove them from the document
  const updateDoc: { $set: Partial<ContributorDoc>; $unset?: Record<string, string> } = { $set: rest };
  if (!('avatarUrl' in rest)) {
    updateDoc.$unset = { ...updateDoc.$unset, avatarUrl: "" };
  }
  if (!('profileUrl' in rest)) {
    updateDoc.$unset = { ...updateDoc.$unset, profileUrl: "" };
  }
  
  const res = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: new (await import("mongodb")).ObjectId(id) },
    updateDoc,
    { returnDocument: "after" }
  );
  
  if (res) {
    // Update all projects that reference this contributor
    await updateProjectsWithContributor(id, serialize(res));
  }
  
  return res ? serialize(res) : null;
}

async function updateProjectsWithContributor(contributorId: string, updatedContributor: ContributorDoc) {
  const db = await getDb();
  // Find all projects that have this contributor
  const projects = await db.collection("projects").find({
    "contributors.id": contributorId
  }).toArray();
  
  // Update each project with the new contributor data
  for (const project of projects) {
    const updatedContributors = project.contributors.map((contributor: { id: string; name?: string; profileUrl?: string; avatarUrl?: string; projectRole?: string }) => {
      if (contributor.id === contributorId) {
        return {
          ...contributor,
          name: updatedContributor.name,
          profileUrl: updatedContributor.profileUrl,
          avatarUrl: updatedContributor.avatarUrl,
        };
      }
      return contributor;
    });
    
    await db.collection("projects").updateOne(
      { _id: project._id },
      { $set: { contributors: updatedContributors } }
    );
  }
}

export async function deleteContributor(id: string) {
  const db = await getDb();
  const res = await db.collection(COLLECTION).deleteOne({ _id: new (await import("mongodb")).ObjectId(id) });
  return res.deletedCount === 1;
}


