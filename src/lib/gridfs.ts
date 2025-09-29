import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export async function getBucket() {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: "media" });
}

export function toObjectId(id: string) {
  return new ObjectId(id);
}


