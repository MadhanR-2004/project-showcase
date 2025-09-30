import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail } from "../../../../lib/users";
import { sendAdminCredentials } from "../../../../lib/email";
import { generateReadablePassword } from "../../../../lib/password-generator";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: "An admin with this email already exists" }, { status: 400 });
    }

    // Generate a random 8-character readable password
    const password = generateReadablePassword(8);
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the admin user
    const user = await createUser({
      email,
      passwordHash,
      role: "admin",
      name,
    });

    // Send credentials via email
    const emailResult = await sendAdminCredentials(email, name, password);

    if (!emailResult.success) {
      // If email fails, we should probably delete the user or log the error
      console.error("Failed to send admin credentials email:", emailResult.error);
      return NextResponse.json({ 
        error: "Admin created but failed to send email. Please contact the administrator.",
        user: { id: user._id, email: user.email, name: user.name }
      }, { status: 201 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Admin created successfully and credentials sent via email",
      user: { id: user._id, email: user.email, name: user.name }
    });

  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json({ 
      error: "Failed to create admin" 
    }, { status: 500 });
  }
}
