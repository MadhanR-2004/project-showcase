import { getDb } from "./mongodb";

export async function ensureIndexes() {
  const db = await getDb();
  
  console.log("Creating/updating database indexes...");
  
  // Projects collection
  const projects = db.collection("projects");
  // Drop legacy slug index if it exists to avoid E11000 on null slug
  try {
    const indexes = await projects.indexes();
    const hasSlug = indexes.some((idx) => idx.name === "slug_1" || (idx.key && (idx.key as Record<string, unknown>)["slug"] === 1));
    if (hasSlug) {
      try { await projects.dropIndex("slug_1"); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  await projects.createIndex({ order: 1, createdAt: -1 });
  await projects.createIndex({ isPublished: 1 });
  await projects.createIndex({ "contributors.id": 1 });
  await projects.createIndex({ tags: 1 });
  
  // Users collection - unified collection for admin and contributors
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ role: 1 });
  await db.collection("users").createIndex({ createdAt: -1 });
  
  // OTPs collection with TTL
  await db.collection("otps").createIndex({ email: 1 });
  await db.collection("otps").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  
  // File references collection (for GridFS cleanup)
  await db.collection("file_references").createIndex({ fileId: 1 });
  await db.collection("file_references").createIndex({ referencedBy: 1 });
  await db.collection("file_references").createIndex({ referenceType: 1 });
  await db.collection("file_references").createIndex(
    { fileId: 1, referencedBy: 1, referenceType: 1 }, 
    { unique: true }
  );
  
  console.log("✅ All indexes created successfully");
}



