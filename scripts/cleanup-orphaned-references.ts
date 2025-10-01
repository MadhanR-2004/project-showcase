/**
 * Cleanup orphaned file references
 * Removes references where the actual GridFS file doesn't exist
 */

import { getDb } from "../src/lib/mongodb";
import { getBucket } from "../src/lib/gridfs";

async function cleanupOrphanedReferences() {
  const db = await getDb();
  const bucket = await getBucket();
  
  console.log("🔍 Finding all file references...");
  const allRefs = await db.collection("file_references").find({}).toArray();
  console.log(`Found ${allRefs.length} references`);
  
  let removedCount = 0;
  
  for (const ref of allRefs) {
    try {
      // Check if file exists in GridFS
      const fileExists = await bucket.find({ _id: { $eq: ref.fileId } }).hasNext();
      
      if (!fileExists) {
        console.log(`❌ File ${ref.fileId} doesn't exist. Removing reference...`);
        await db.collection("file_references").deleteOne({ _id: ref._id });
        removedCount++;
        
        // Optionally clean up the URL from documents
        if (ref.referenceType.startsWith("user_")) {
          const field = ref.referenceType === "user_avatar" ? "avatarUrl" : "profileUrl";
          await db.collection("users").updateOne(
            { _id: ref.referencedBy },
            { $set: { [field]: "" } }
          );
          console.log(`  ✅ Cleaned ${field} from user ${ref.referencedBy}`);
        } else if (ref.referenceType.startsWith("project_")) {
          // For projects, you'd need more complex logic
          console.log(`  ⚠️ Manual cleanup needed for project ${ref.referencedBy}`);
        }
      }
    } catch (error) {
      console.error(`Error checking file ${ref.fileId}:`, error);
    }
  }
  
  console.log(`\n✅ Cleanup complete!`);
  console.log(`Removed ${removedCount} orphaned references`);
  
  process.exit(0);
}

cleanupOrphanedReferences().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
