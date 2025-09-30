import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { getProjectById } from "../../../../lib/projects";
import { Project } from "../../../../lib/types";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

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
  const res = await db
    .collection<Project>("projects")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .findOneAndUpdate({ _id: new ObjectId(id) } as any, { $set: body }, { returnDocument: "after" });
  if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(res);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await db.collection<Project>("projects").deleteOne({ _id: new ObjectId(id) } as any);
  if (res.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
