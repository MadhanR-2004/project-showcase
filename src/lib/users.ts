import { getDb } from "./mongodb";
import { Document } from "mongodb";
import bcrypt from "bcryptjs";

export interface UserDoc {
  _id?: string;
  email: string;
  passwordHash: string;
  role: "admin" | "editor";
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION = "users";

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const db = await getDb();
  const user = await db.collection<UserDoc>(COLLECTION).findOne({ email: email.toLowerCase() });
  return user ? serialize(user) : null;
}

export async function createUser(user: Omit<UserDoc, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc = { ...user, email: user.email.toLowerCase(), createdAt: now, updatedAt: now };
  const res = await db.collection<UserDoc>(COLLECTION).insertOne(doc);
  return { ...doc, _id: String(res.insertedId) } as UserDoc;
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

function serialize(doc: Document): UserDoc {
  const { _id, ...rest } = doc;
  return { _id: _id ? String(_id) : undefined, ...(rest as Omit<UserDoc, "_id">) };
}


