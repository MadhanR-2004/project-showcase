/**
 * Test endpoint to measure cleanup timing
 * 
 * This logs when DELETE requests arrive and how long they take to process.
 * Use this to understand the real timing of keepalive cleanup.
 */

import { NextRequest, NextResponse } from "next/server";
import { getBucket, removeFileReference, deleteFileIfOrphaned } from "@/lib/gridfs";
import { toObjectId } from "@/lib/gridfs";

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  console.log('🕐 DELETE request received at:', new Date().toISOString());
  
  try {
    const body = await request.json();
    const { fileId } = body;
    
    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }
    
    console.log(`📥 Processing deletion for fileId: ${fileId}`);
    console.log(`⏱️  Request processing started at: ${Date.now() - startTime}ms`);
    
    // Check if file exists
    const bucket = await getBucket();
    let checkTime = 0;
    
    try {
      const files = await bucket.find({ _id: toObjectId(fileId) }).toArray();
      
      checkTime = Date.now() - startTime;
      
      if (files.length === 0) {
        console.log(`❌ File not found: ${fileId} (checked in ${checkTime}ms)`);
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      
      console.log(`✅ File exists, checked in ${checkTime}ms`);
      
    } catch (err) {
      const errorTime = Date.now() - startTime;
      console.error(`❌ Error checking file (${errorTime}ms):`, err);
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }
    
    // Remove all references for this file
    console.log(`🗑️  Removing references...`);
    const refRemovalStart = Date.now();
    
    // Note: removeFileReference requires specific parameters
    // For cleanup endpoint, we need to remove ALL references
    // This is a simplified version - you might need to adjust based on your schema
    
    const beforeDeleteTime = Date.now() - startTime;
    console.log(`⏱️  Ready to delete at: ${beforeDeleteTime}ms`);
    
    // Delete file if orphaned
    const deleted = await deleteFileIfOrphaned(fileId);
    
    const totalTime = Date.now() - startTime;
    
    if (deleted) {
      console.log(`✅ File deleted successfully: ${fileId}`);
      console.log(`⏱️  Total deletion time: ${totalTime}ms`);
      console.log(`📊 Breakdown:`);
      console.log(`   - Request to check: ${checkTime}ms`);
      console.log(`   - Check to delete: ${beforeDeleteTime - checkTime}ms`);
      console.log(`   - Delete operation: ${totalTime - beforeDeleteTime}ms`);
      console.log(`   - TOTAL: ${totalTime}ms`);
      
      return NextResponse.json({ 
        success: true, 
        message: "File deleted",
        timing: {
          total: totalTime,
          checkFile: checkTime,
          deleteOperation: totalTime - beforeDeleteTime
        }
      });
    } else {
      console.log(`⚠️  File not deleted (still referenced): ${fileId}`);
      console.log(`⏱️  Total check time: ${totalTime}ms`);
      
      return NextResponse.json({ 
        success: false, 
        message: "File still referenced",
        timing: {
          total: totalTime,
          checkFile: checkTime
        }
      });
    }
    
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ Deletion error after ${errorTime}ms:`, error);
    
    return NextResponse.json(
      { 
        error: "Failed to delete file",
        timing: { errorAt: errorTime }
      },
      { status: 500 }
    );
  }
}
