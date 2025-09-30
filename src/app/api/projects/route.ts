import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "../../../lib/projects";
import { getDb } from "../../../lib/mongodb";
import { Project } from "../../../lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 24);
  const skip = Number(searchParams.get("skip") ?? 0);
  const contributorId = searchParams.get("contributorId");

  // If contributorId is provided, filter directly in DB for associated projects
  if (contributorId) {
    const db = await getDb();
    const cursor = db
      .collection<Project>("projects")
      .find({ "contributors.id": contributorId, isPublished: { $ne: false } })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);
    const docs = await cursor.toArray();
    return NextResponse.json({ projects: docs.map((d) => ({ ...d, _id: d._id?.toString?.() ?? d._id })) });
  }

  const projects = await listProjects(limit, skip);
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Backend validation
  const required = [
    { key: 'title', label: 'Title' },
    { key: 'shortDescription', label: 'Short Description' },
    { key: 'description', label: 'Description' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'poster', label: 'Poster Image' },
  ];
  for (const r of required) {
    if (!body[r.key] || (typeof body[r.key] === 'string' && !body[r.key].trim())) {
      return NextResponse.json({ error: `${r.label} is required` }, { status: 400 });
    }
  }
  if (!Array.isArray(body.techStack) || !body.techStack.length) {
    return NextResponse.json({ error: 'At least one tech stack is required' }, { status: 400 });
  }
  if (!Array.isArray(body.contributors) || !body.contributors.length) {
    return NextResponse.json({ error: 'At least one contributor is required' }, { status: 400 });
  }
  // Video link required
  const hasVideo = (body.media && ((body.media.kind === 'youtube' && body.media.url) || (body.media.kind === 'gdrive' && body.media.url) || (body.media.kind === 'onedrive' && body.media.url)));
  if (!hasVideo) {
    return NextResponse.json({ error: 'At least one video link is required' }, { status: 400 });
  }
  if (!Array.isArray(body.showcasePhotos) || !body.showcasePhotos.length) {
    return NextResponse.json({ error: 'At least one showcase photo is required' }, { status: 400 });
  }
  const created = await createProject(body);
  return NextResponse.json(created, { status: 201 });
}



