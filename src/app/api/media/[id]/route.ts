import { NextRequest } from "next/server";
import { getBucket, toObjectId } from "../../../../lib/gridfs";
import { Document } from "mongodb";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bucket = await getBucket();
  const _id = toObjectId(id);
  const fileCursor = bucket.find({ _id });
  const file: Document | null = await fileCursor.next();
  if (!file) return new Response("Not found", { status: 404 });
  const nodeStream = bucket.openDownloadStream(_id);
  // Buffer the file fully before responding to sidestep dev-server streaming quirks on Windows
  const chunks: Buffer[] = await new Promise((resolve, reject) => {
    const acc: Buffer[] = [];
    nodeStream.on("data", (chunk: Buffer) => acc.push(chunk));
    nodeStream.on("end", () => resolve(acc));
    nodeStream.on("error", (err) => reject(err));
  });
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  const contentType = file.contentType || file.metadata?.contentType || guessTypeFromFilename(file.filename) || "application/octet-stream";
  headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (file.length) headers.set("content-length", String(file.length));
  if (file.filename) headers.set("content-disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);
  if (file.md5) headers.set("etag", file.md5);
  return new Response(body, { headers });
}

function guessTypeFromFilename(name?: string) {
  if (!name) return undefined;
  const lower = String(name).toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return undefined;
}



