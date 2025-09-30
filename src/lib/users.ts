import { getDb } from "./mongodb";
import { Document, ObjectId } from "mongodb";
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

export interface OTPDoc {
  _id?: string;
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

const COLLECTION = "users";
const OTP_COLLECTION = "otps";

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

export async function updateUserPassword(email: string, newPassword: string) {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const result = await db.collection<UserDoc>(COLLECTION).updateOne(
    { email: email.toLowerCase() },
    { $set: { passwordHash, updatedAt: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

export async function createOTP(email: string, otp: string) {
  const db = await getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
  
  // Delete any existing OTPs for this email
  await db.collection<OTPDoc>(OTP_COLLECTION).deleteMany({ email: email.toLowerCase() });
  
  const otpDoc = {
    email: email.toLowerCase(),
    otp,
    expiresAt,
    createdAt: now,
  };
  
  const result = await db.collection<OTPDoc>(OTP_COLLECTION).insertOne(otpDoc);
  return { _id: String(result.insertedId), ...otpDoc };
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  
  const otpDoc = await db.collection<OTPDoc>(OTP_COLLECTION).findOne({
    email: email.toLowerCase(),
    otp,
    expiresAt: { $gt: now }
  });
  
  // Don't delete the OTP here - we need it for password reset
  return !!otpDoc;
}

export async function deleteOTP(email: string, otp: string): Promise<void> {
  const db = await getDb();
  await db.collection<OTPDoc>(OTP_COLLECTION).deleteOne({
    email: email.toLowerCase(),
    otp
  });
}

function serialize(doc: Document): UserDoc {
  const { _id, ...rest } = doc;
  return { _id: _id ? String(_id) : undefined, ...(rest as Omit<UserDoc, "_id">) };
}


