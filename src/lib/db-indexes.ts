import { getDb } from "./mongodb";

export async function ensureIndexes() {
  const db = await getDb();
  const projects = db.collection("projects");
  await projects.createIndex({ slug: 1 }, { unique: true });
  await projects.createIndex({ order: 1, createdAt: -1 });
}



