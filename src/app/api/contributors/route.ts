import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "../auth/admin/[...nextauth]/route";
import { createContributor, ContributorDoc } from "../../../lib/contributors";
import { createUser, findUserByEmail, listContributors } from "../../../lib/users";
import { sendContributorCredentials } from "../../../lib/email";
import { generateReadablePassword } from "../../../lib/password-generator";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  // Require admin authentication
  const session = await getServerSession(adminAuthOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  
  // Fetch from unified users collection (users with contributor or both role)
  const items = await listContributors();
  
  // If email parameter is provided, filter by email for uniqueness check
  if (email) {
    const filtered = items.filter(c => c.email === email);
    return NextResponse.json({ contributors: filtered });
  }
  
  return NextResponse.json({ contributors: items });
}

export async function POST(req: NextRequest) {
  // Require admin authentication
  const session = await getServerSession(adminAuthOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  // Backend validation
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!body.email || !body.email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }
  // Uniqueness check
  const all = await listContributors();
  if (all.some((c) => c.email === body.email)) {
    return NextResponse.json({ error: 'Email must be unique' }, { status: 400 });
  }
  // Ensure no user exists with same email
  const existingUser = await findUserByEmail(body.email);
  if (existingUser) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
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
  // Create contributor profile
  const created = await createContributor(body);

  // Create contributor user with random password
  const password = generateReadablePassword(8);
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({
    email: body.email,
    passwordHash,
    role: "contributor",
    name: body.name,
  });

  // Email credentials
  const emailResult = await sendContributorCredentials(body.email, body.name, password);
  if (!emailResult.success) {
    console.error("Failed to send contributor credentials email:", emailResult.error);
    // Still return created but inform email failure
    return NextResponse.json({
      contributor: created,
      user: { id: user._id, email: user.email },
      warning: 'Contributor created, but failed to send credentials email. Please notify the user manually.'
    }, { status: 201 });
  }

  return NextResponse.json({ contributor: created, user: { id: user._id, email: user.email } }, { status: 201 });
}


