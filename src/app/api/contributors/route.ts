import { NextRequest, NextResponse } from "next/server";
import { createContributor, listContributors, ContributorDoc } from "../../../lib/contributors";

export async function GET() {
  const items = await listContributors();
  return NextResponse.json({ contributors: items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Backend validation
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!body.email || !body.email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  // Uniqueness check
  const all = await listContributors();
  if (all.some((c: ContributorDoc) => c.email === body.email)) {
    return NextResponse.json({ error: 'Email must be unique' }, { status: 400 });
  }
  if (!body.contributorType || !['student', 'staff'].includes(body.contributorType)) {
    return NextResponse.json({ error: 'Contributor type is required' }, { status: 400 });
  }
  if (body.contributorType === 'student' && !body.branch) {
    return NextResponse.json({ error: 'Branch is required for students' }, { status: 400 });
  }
  if (body.contributorType === 'student' && !body.yearOfPassing) {
    return NextResponse.json({ error: 'Year of passing is required for students' }, { status: 400 });
  }
  if (body.contributorType === 'staff' && !body.staffTitle) {
    return NextResponse.json({ error: 'Staff title is required for staff' }, { status: 400 });
  }
  const created = await createContributor(body);
  return NextResponse.json(created, { status: 201 });
}


