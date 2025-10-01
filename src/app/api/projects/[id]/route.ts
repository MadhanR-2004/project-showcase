import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { getProjectById, updateProject } from "../../../../lib/projects";
import { Project } from "../../../../lib/types";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { removeFileReference, deleteFileIfOrphaned } from "../../../../lib/gridfs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Auth: allow admin or contributor associated with this project
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const email = (session.user as { email?: string } | undefined)?.email;

  const db = await getDb();
  const body = (await req.json()) as Partial<Project>;
  body.updatedAt = new Date().toISOString();

  // If not admin, verify that this contributor is part of the project
  if (role !== "admin") {
    // Get contributor id by email
    let contributorId: string | null = null;
    try {
      const res = await fetch(`${process.env.NEXTAUTH_URL || ""}/api/contributors?email=${encodeURIComponent(email || "")}`);
      const data = await res.json();
      contributorId = Array.isArray(data.contributors) && data.contributors[0]?._id ? data.contributors[0]._id : null;
    } catch {
      contributorId = null;
    }
    if (!contributorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Ensure the target project contains this contributor id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exists = await db.collection<Project>("projects").findOne({ _id: new ObjectId(id) } as any);
    if (!exists || !Array.isArray(exists.contributors) || !exists.contributors.some((c) => c.id === contributorId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  
  // Use updateProject function to properly handle file references
  const updated = await updateProject(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  
  // Get project first to cleanup files
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = await db.collection<Project>("projects").findOne({ _id: new ObjectId(id) } as any);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  // Delete the project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await db.collection<Project>("projects").deleteOne({ _id: new ObjectId(id) } as any);
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  // Cleanup associated files and references
  const filesToCleanup: Array<{ url: string; type: "project_poster" | "project_thumbnail" | "project_showcase" }> = [];
  
  if (project.poster && project.poster.startsWith("/api/media/")) {
    filesToCleanup.push({ url: project.poster, type: "project_poster" });
  }
  if (project.thumbnail && project.thumbnail.startsWith("/api/media/")) {
    filesToCleanup.push({ url: project.thumbnail, type: "project_thumbnail" });
  }
  if (Array.isArray(project.showcasePhotos)) {
    project.showcasePhotos.forEach(url => {
      if (url.startsWith("/api/media/")) {
        filesToCleanup.push({ url, type: "project_showcase" });
      }
    });
  }
  
  // Remove file references and delete if orphaned
  for (const { url, type } of filesToCleanup) {
    const fileId = url.replace("/api/media/", "");
    try {
      await removeFileReference(fileId, id, type);
      await deleteFileIfOrphaned(fileId);
    } catch (err) {
      console.error(`Failed to cleanup file ${fileId}:`, err);
    }
  }
  
  return NextResponse.json({ ok: true, filesCleanedUp: filesToCleanup.length });
}
