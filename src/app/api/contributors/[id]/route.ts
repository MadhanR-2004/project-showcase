import { NextRequest, NextResponse } from "next/server";
import { deleteContributor, updateContributor, getContributorById, ContributorDoc } from "../../../../lib/contributors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contributor = await getContributorById(id);
  if (!contributor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contributor);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  
  // Clean up null values - remove fields that are null
  const cleanedBody = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== null)
  ) as Partial<ContributorDoc>;
  
  // Backend validation
  if (!cleanedBody.name || !cleanedBody.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!cleanedBody.email || !cleanedBody.email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  // Uniqueness check (allow current contributor's own email)
  const all = await (await import('../../../../lib/contributors')).listContributors();
  if (all.some((c: ContributorDoc) => c.email === cleanedBody.email && c._id !== id)) {
    return NextResponse.json({ error: 'Email must be unique' }, { status: 400 });
  }
  if (!cleanedBody.contributorType || !['student', 'staff'].includes(cleanedBody.contributorType)) {
    return NextResponse.json({ error: 'Contributor type is required' }, { status: 400 });
  }
  if (cleanedBody.contributorType === 'student' && !cleanedBody.branch) {
    return NextResponse.json({ error: 'Branch is required for students' }, { status: 400 });
  }
  if (cleanedBody.contributorType === 'student' && !cleanedBody.yearOfPassing) {
    return NextResponse.json({ error: 'Year of passing is required for students' }, { status: 400 });
  }
  if (cleanedBody.contributorType === 'staff' && !cleanedBody.staffTitle) {
    return NextResponse.json({ error: 'Staff title is required for staff' }, { status: 400 });
  }
  const updated = await updateContributor(id, cleanedBody);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteContributor(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}


