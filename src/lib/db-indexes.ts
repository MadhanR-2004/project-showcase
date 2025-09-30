import { getDb } from "./mongodb";

export async function ensureIndexes() {
  const db = await getDb();
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
}



