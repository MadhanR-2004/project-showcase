import { getDb } from "./mongodb";
import { Document, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { addFileReference, removeFileReference, deleteFileIfOrphaned } from "./gridfs";

export interface UserDoc {
  _id?: string;
  email: string;
  passwordHash: string;
  role: "admin" | "contributor" | "both"; // Simplified: admin, contributor, or both
  name?: string;
  // Contributor-specific fields (optional, only for contributors)
  contributorType?: "student" | "staff";
  branch?: "IT" | "ADS";
  staffTitle?: "Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department";
  yearOfPassing?: string;
  registerNo?: string; // 14-digit register number for students
  avatarUrl?: string;
  profileUrl?: string;
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

// Get user by ID
export async function getUserById(id: string): Promise<UserDoc | null> {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await db.collection<UserDoc>(COLLECTION).findOne({ _id: new ObjectId(id) } as any);
  return user ? serialize(user) : null;
}

// Update user profile (for contributors)
export async function updateUser(id: string, updates: Partial<Omit<UserDoc, "_id" | "email" | "passwordHash" | "createdAt">>) {
  const db = await getDb();
  
  console.log("updateUser called with id:", id, "updates:", JSON.stringify(updates, null, 2));
  
  // Get existing user to track avatar changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await db.collection<UserDoc>(COLLECTION).findOne({ _id: new ObjectId(id) } as any);
  
  console.log("Existing user avatarUrl:", existing?.avatarUrl, "profileUrl:", existing?.profileUrl);
  
  const updateDoc = { ...updates, updatedAt: new Date().toISOString() };
  const result = await db.collection<UserDoc>(COLLECTION).findOneAndUpdate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { _id: new ObjectId(id) } as any,
    { $set: updateDoc },
    { returnDocument: "after" }
  );
  
  // Handle avatar file reference updates
  if (updates.avatarUrl !== undefined && existing) {
    console.log("Avatar update detected - old:", existing.avatarUrl, "new:", updates.avatarUrl);
    
    // Check if old avatar is a GridFS file that needs cleanup
    const oldIsGridFS = existing.avatarUrl && existing.avatarUrl.startsWith("/api/media/");
    const newIsGridFS = updates.avatarUrl && updates.avatarUrl.startsWith("/api/media/");
    
    console.log("Avatar - oldIsGridFS:", oldIsGridFS, "newIsGridFS:", newIsGridFS);
    
    // Only update references if the URL actually changed
    if (existing.avatarUrl !== updates.avatarUrl) {
      // Remove old file reference if it's being replaced or removed
      if (oldIsGridFS) {
        const oldFileId = existing.avatarUrl!.replace("/api/media/", "");
        console.log("Removing avatar file reference:", oldFileId);
        await removeFileReference(oldFileId, id, "user_avatar");
        await deleteFileIfOrphaned(oldFileId);
      }
      
      // Add new file reference if new avatar is a GridFS file
      if (newIsGridFS) {
        const newFileId = updates.avatarUrl!.replace("/api/media/", "");
        console.log("Adding avatar file reference:", newFileId);
        await addFileReference(newFileId, id, "user_avatar");
      }
    } else {
      console.log("Avatar URL unchanged, skipping reference update");
    }
  }
  
  // Handle profileUrl if it's a GridFS file
  if (updates.profileUrl !== undefined && existing) {
    console.log("Profile update detected - old:", existing.profileUrl, "new:", updates.profileUrl);
    const oldIsGridFS = existing.profileUrl && existing.profileUrl.startsWith("/api/media/");
    const newIsGridFS = updates.profileUrl && updates.profileUrl.startsWith("/api/media/");
    
    console.log("Profile - oldIsGridFS:", oldIsGridFS, "newIsGridFS:", newIsGridFS);
    
    // Only update references if the URL actually changed
    if (existing.profileUrl !== updates.profileUrl) {
      // Remove old file reference if it's being replaced or removed
      if (oldIsGridFS) {
        const oldFileId = existing.profileUrl!.replace("/api/media/", "");
        console.log("Removing profile file reference:", oldFileId);
        await removeFileReference(oldFileId, id, "user_profile");
        await deleteFileIfOrphaned(oldFileId);
      }
      
      // Add new file reference if new profile is a GridFS file
      if (newIsGridFS) {
        const newFileId = updates.profileUrl!.replace("/api/media/", "");
        console.log("Adding profile file reference:", newFileId);
        await addFileReference(newFileId, id, "user_profile");
      }
    } else {
      console.log("Profile URL unchanged, skipping reference update");
    }
  }
  
  console.log("User update complete");
  return result ? serialize(result) : null;
}

// Delete user and cleanup files
export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDb();
  
  // Get user to cleanup files
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await db.collection<UserDoc>(COLLECTION).findOne({ _id: new ObjectId(id) } as any);
  if (!user) return false;
  
  // Delete the user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.collection<UserDoc>(COLLECTION).deleteOne({ _id: new ObjectId(id) } as any);
  
  if (result.deletedCount > 0) {
    // Remove file references and cleanup
    if (user.avatarUrl && user.avatarUrl.startsWith("/api/media/")) {
      const fileId = user.avatarUrl.replace("/api/media/", "");
      await removeFileReference(fileId, id, "user_avatar");
      await deleteFileIfOrphaned(fileId);
    }
    if (user.profileUrl && user.profileUrl.startsWith("/api/media/")) {
      const fileId = user.profileUrl.replace("/api/media/", "");
      await removeFileReference(fileId, id, "user_profile");
      await deleteFileIfOrphaned(fileId);
    }
    return true;
  }
  
  return false;
}

// List all contributors (users with contributor or both role)
export async function listContributors(): Promise<UserDoc[]> {
  const db = await getDb();
  const users = await db.collection<UserDoc>(COLLECTION)
    .find({ role: { $in: ["contributor", "both"] } })
    .sort({ createdAt: -1 })
    .toArray();
  return users.map(serialize);
}

// List all users (regardless of role) with pagination support
export async function listUsers(limit = 1000, skip = 0): Promise<UserDoc[]> {
  const db = await getDb();
  const users = await db.collection<UserDoc>(COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  return users.map(serialize);
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


