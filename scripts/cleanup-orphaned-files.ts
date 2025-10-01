/**
 * Server-Side Cleanup for Orphaned Files
 * 
 * This script finds and deletes files that have no references.
 * Run this periodically (e.g., every hour) to catch files that weren't 
 * cleaned up by client-side navigation cleanup.
 * 
 * Usage:
 *   npm run cleanup:files
 * 
 * Or manually:
 *   npx tsx scripts/cleanup-orphaned-files.ts
 */

import { getBucket } from '../src/lib/gridfs';
import { getDb } from '../src/lib/mongodb';
import { ObjectId } from 'mongodb';

const FILE_REFS_COLLECTION = 'file_references';

interface CleanupOptions {
  olderThanMinutes?: number; // Only delete files older than X minutes
  dryRun?: boolean; // If true, only report what would be deleted
}

async function cleanupOrphanedFiles(options: CleanupOptions = {}) {
  const { olderThanMinutes = 60, dryRun = false } = options;
  
  console.log('🧹 Starting orphaned file cleanup...');
  console.log(`⏰ Targeting files older than ${olderThanMinutes} minutes`);
  console.log(`🔍 Mode: ${dryRun ? 'DRY RUN (no deletion)' : 'LIVE (will delete)'}`);
  console.log('');
  
  try {
    const db = await getDb();
    const bucket = await getBucket();
    
    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    console.log(`📅 Cutoff time: ${cutoffTime.toISOString()}`);
    console.log('');
    
    // Get all files in GridFS older than cutoff
    const allFiles = await bucket.find({
      uploadDate: { $lt: cutoffTime }
    }).toArray();
    
    console.log(`📊 Found ${allFiles.length} files older than cutoff`);
    
    if (allFiles.length === 0) {
      console.log('✅ No old files found. Nothing to clean up!');
      return { deleted: 0, kept: 0, total: 0 };
    }
    
    // Get all referenced file IDs
    const allReferences = await db.collection(FILE_REFS_COLLECTION)
      .find({})
      .toArray();
    
    const referencedFileIds = new Set(
      allReferences.map(ref => ref.fileId)
    );
    
    console.log(`📎 Found ${referencedFileIds.size} referenced files`);
    console.log('');
    
    // Check each file
    let deletedCount = 0;
    let keptCount = 0;
    const orphanedFiles: Array<{ id: string; filename: string; size: number; uploadDate: Date }> = [];
    
    for (const file of allFiles) {
      const fileId = file._id.toString();
      const isReferenced = referencedFileIds.has(fileId);
      
      if (!isReferenced) {
        // File is orphaned!
        orphanedFiles.push({
          id: fileId,
          filename: file.filename || 'unknown',
          size: file.length || 0,
          uploadDate: file.uploadDate
        });
        
        if (!dryRun) {
          try {
            await bucket.delete(new ObjectId(fileId));
            deletedCount++;
            console.log(`🗑️  Deleted: ${fileId} (${file.filename}) - ${Math.round(file.length / 1024)}KB`);
          } catch (error) {
            console.error(`❌ Failed to delete ${fileId}:`, error);
          }
        }
      } else {
        keptCount++;
      }
    }
    
    console.log('');
    console.log('=' .repeat(60));
    console.log('📊 Cleanup Summary');
    console.log('='.repeat(60));
    
    if (dryRun) {
      console.log(`🔍 WOULD DELETE: ${orphanedFiles.length} orphaned files`);
      console.log(`✅ WOULD KEEP: ${keptCount} referenced files`);
      console.log('');
      
      if (orphanedFiles.length > 0) {
        console.log('📋 Orphaned files that would be deleted:');
        orphanedFiles.forEach(file => {
          console.log(`   - ${file.filename} (${file.id})`);
          console.log(`     Size: ${Math.round(file.size / 1024)}KB`);
          console.log(`     Uploaded: ${file.uploadDate.toISOString()}`);
          console.log('');
        });
        
        const totalSize = orphanedFiles.reduce((sum, f) => sum + f.size, 0);
        console.log(`💾 Total size to be freed: ${Math.round(totalSize / 1024 / 1024)}MB`);
      }
    } else {
      console.log(`🗑️  DELETED: ${deletedCount} orphaned files`);
      console.log(`✅ KEPT: ${keptCount} referenced files`);
      console.log(`📁 TOTAL PROCESSED: ${allFiles.length} files`);
    }
    
    console.log('='.repeat(60));
    
    return {
      deleted: deletedCount,
      kept: keptCount,
      total: allFiles.length
    };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run cleanup if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const olderThanMinutes = parseInt(args.find(arg => arg.startsWith('--older-than='))?.split('=')[1] || '60');
  
  console.log('🚀 GridFS Orphaned File Cleanup Tool');
  console.log('');
  
  cleanupOrphanedFiles({ dryRun, olderThanMinutes })
    .then(() => {
      console.log('');
      console.log('✅ Cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupOrphanedFiles };
