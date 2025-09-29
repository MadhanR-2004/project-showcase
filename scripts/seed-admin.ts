import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// Load .env.local first, then fall back to .env
const envLocalPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envLocalPath });
dotenv.config();

async function main() {
  const { getDb } = await import("../src/lib/mongodb");
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD required");

  const db = await getDb();
  const users = db.collection("users");
  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log("Admin already exists:", email);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  await users.insertOne({ email: email.toLowerCase(), passwordHash, role: "admin", createdAt: now, updatedAt: now });
  console.log("Admin created:", email);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });


