
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "../../auth/admin/[...nextauth]/route";
import { contributorAuthOptions } from "../../auth/contributor/[...nextauth]/route";
import { Readable } from "node:stream";
import { getBucket } from "../../../../lib/gridfs";

export async function POST(req: NextRequest) {
  // Require authentication from either admin or contributor
  const adminSession = await getServerSession(adminAuthOptions);
  const contributorSession = await getServerSession(contributorAuthOptions);
  
  if (!adminSession && !contributorSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bucket = await getBucket();
  // Try to use formData, but only if it succeeds synchronously (if it throws, fallback)
  let form: FormData | undefined = undefined;
  try {
    form = await req.formData();
  } catch {
    // If formData fails, fallback to raw body
  }
  if (form) {
    const file = form.get("file") as unknown as File | null;
    if (file && typeof file.arrayBuffer === "function") {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = file.name || `upload-${Date.now()}`;
      const contentType = file.type || "application/octet-stream";
      const uploadStream = bucket.openUploadStream(filename, { contentType });
      Readable.from(buffer).pipe(uploadStream);
      await new Promise<void>((resolve, reject) => {
        uploadStream.on("finish", () => resolve());
        uploadStream.on("error", (err) => reject(err));
      });
      return NextResponse.json({ fileId: String(uploadStream.id), contentType });
    }
    // If no file, treat as error
    return NextResponse.json({ error: "No file in form" }, { status: 400 });
  }
  // Fallback: buffer entire body and upload (only if formData was never read)
  const filename = req.headers.get("x-filename") || `upload-${Date.now()}`;
  const ab = await req.arrayBuffer();
  if (!ab || ab.byteLength === 0) {
    return NextResponse.json({ error: "No body" }, { status: 400 });
  }
  const buffer = Buffer.from(ab);
  const contentType = req.headers.get("content-type") || "application/octet-stream";
  const uploadStream = bucket.openUploadStream(filename, { contentType });
  Readable.from(buffer).pipe(uploadStream);
  await new Promise<void>((resolve, reject) => {
    uploadStream.on("finish", () => resolve());
    uploadStream.on("error", (err) => reject(err));
  });
  return NextResponse.json({ fileId: String(uploadStream.id), contentType });
}


