/**
 * Migration Script: Merge Contributors into Users Collection
 * 
 * This script merges the separate "contributors" collection into the "users" collection
 * and updates all existing user roles to the new schema.
 * 
 * Run with: npm run migrate:users
 */

import { config } from "dotenv";
import { MongoClient } from "mongodb";

config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;

if (!MONGODB_URI || !DB_NAME) {
  console.error("❌ Missing MONGODB_URI or MONGODB_DB environment variables");
  process.exit(1);
}

async function migrateUsers() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection("users");
    const contributorsCollection = db.collection("contributors");
    
    // Check if contributors collection exists
    const collections = await db.listCollections({ name: "contributors" }).toArray();
    const hasContributors = collections.length > 0;
    
    if (hasContributors) {
      console.log("📦 Found contributors collection, migrating...");
      
      // Get all contributors
      const contributors = await contributorsCollection.find({}).toArray();
      console.log(`Found ${contributors.length} contributors to migrate`);
      
      // Migrate each contributor to users collection
      for (const contributor of contributors) {
        const existingUser = await usersCollection.findOne({ email: contributor.email.toLowerCase() });
        
        if (existingUser) {
          // User already exists - update role to "both" if they're an admin
          if (existingUser.role === "admin") {
            await usersCollection.updateOne(
              { _id: existingUser._id },
              { 
                $set: { 
                  role: "both",
                  // Add contributor fields
                  contributorType: contributor.contributorType,
                  branch: contributor.branch,
                  staffTitle: contributor.staffTitle,
                  yearOfPassing: contributor.yearOfPassing,
                  avatarUrl: contributor.avatarUrl,
                  profileUrl: contributor.profileUrl,
                  updatedAt: new Date().toISOString()
                } 
              }
            );
            console.log(`✅ Updated ${contributor.email} to "both" role`);
          } else {
            // Just update contributor fields
            await usersCollection.updateOne(
              { _id: existingUser._id },
              { 
                $set: { 
                  contributorType: contributor.contributorType,
                  branch: contributor.branch,
                  staffTitle: contributor.staffTitle,
                  yearOfPassing: contributor.yearOfPassing,
                  avatarUrl: contributor.avatarUrl,
                  profileUrl: contributor.profileUrl,
                  updatedAt: new Date().toISOString()
                } 
              }
            );
            console.log(`✅ Updated contributor fields for ${contributor.email}`);
          }
        } else {
          // Create new user with contributor role
          // Note: This creates a user without password - they'll need to reset it
          await usersCollection.insertOne({
            email: contributor.email.toLowerCase(),
            passwordHash: "", // Empty password hash - user must reset password
            role: "contributor",
            name: contributor.name,
            contributorType: contributor.contributorType,
            branch: contributor.branch,
            staffTitle: contributor.staffTitle,
            yearOfPassing: contributor.yearOfPassing,
            avatarUrl: contributor.avatarUrl,
            profileUrl: contributor.profileUrl,
            createdAt: contributor.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log(`✅ Created new user for contributor ${contributor.email}`);
        }
      }
      
      // Optional: Rename contributors collection as backup
      await contributorsCollection.rename("contributors_backup");
      console.log("📦 Renamed contributors collection to contributors_backup");
    } else {
      console.log("ℹ️  No contributors collection found - skipping migration");
    }
    
    // Update any existing users with "editor" role to "admin" (if needed)
    const editorUsers = await usersCollection.find({ role: "editor" }).toArray();
    if (editorUsers.length > 0) {
      await usersCollection.updateMany(
        { role: "editor" },
        { $set: { role: "admin" } }
      );
      console.log(`✅ Updated ${editorUsers.length} editor users to admin role`);
    }
    
    console.log("\n✅ Migration completed successfully!");
    console.log("\n⚠️  IMPORTANT NOTES:");
    console.log("1. Contributors migrated without passwords need to use 'Forgot Password' to set passwords");
    console.log("2. Old contributors collection backed up as 'contributors_backup'");
    console.log("3. Run the seed-admin script if you need to create admin accounts");
    console.log("4. Update project references if needed (contributors.id should reference user _id)");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n✅ Database connection closed");
  }
}

migrateUsers();
