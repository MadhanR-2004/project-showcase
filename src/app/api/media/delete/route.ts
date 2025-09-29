import { NextRequest, NextResponse } from "next/server";
import { getBucket, toObjectId } from "../../../../lib/gridfs";

export async function DELETE(req: NextRequest) {
  try {
    const { fileId } = await req.json();
    if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    
    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(fileId)) {
      return NextResponse.json({ error: "Invalid fileId format" }, { status: 400 });
    }
    
    const bucket = await getBucket();
    
    // Check if file exists before deleting
    const files = await bucket.find({ _id: toObjectId(fileId) }).toArray();
    if (files.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    
    await bucket.delete(toObjectId(fileId));
    console.log('GridFS file deleted successfully:', fileId);
    return NextResponse.json({ success: true, message: "File deleted successfully" });
  } catch (err: unknown) {
    console.error('GridFS delete error:', err);
    return NextResponse.json({ error: (err as Error).message || "Delete failed" }, { status: 500 });
  }
}
