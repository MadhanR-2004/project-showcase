import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { getProjectById } from "../../../../lib/projects";
import { Project } from "../../../../lib/types";
import { ObjectId } from "mongodb";

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
  const db = await getDb();
  const body = (await req.json()) as Partial<Project>;
  body.updatedAt = new Date().toISOString();
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
