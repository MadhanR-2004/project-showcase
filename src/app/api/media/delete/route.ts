import { NextRequest, NextResponse } from "next/server";
import { getBucket, toObjectId } from "../../../../lib/gridfs";
import { getDb } from "../../../../lib/mongodb";

export async function DELETE(req: NextRequest) {
  try {
    const { fileId } = await req.json();
    if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    
    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(fileId)) {
      return NextResponse.json({ error: "Invalid fileId format" }, { status: 400 });
    }
    
    const bucket = await getBucket();
    const db = await getDb();
    
    // Check if file exists before deleting
    const files = await bucket.find({ _id: toObjectId(fileId) }).toArray();
    if (files.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    
    // Delete the file from GridFS
    await bucket.delete(toObjectId(fileId));
    console.log('GridFS file deleted successfully:', fileId);
    
    // Delete ALL references to this file from file_references collection
    const deleteResult = await db.collection("file_references").deleteMany({ fileId });
    console.log(`Deleted ${deleteResult.deletedCount} reference(s) for file ${fileId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: "File deleted successfully", 
      referencesDeleted: deleteResult.deletedCount 
    });
  } catch (err: unknown) {
    console.error('GridFS delete error:', err);
    return NextResponse.json({ error: (err as Error).message || "Delete failed" }, { status: 500 });
  }
}
