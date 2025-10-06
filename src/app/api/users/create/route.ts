import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail, listContributors, UserDoc } from "../../../../lib/users";
import { sendAdminCredentials, sendContributorCredentials, sendDualRoleCredentials } from "../../../../lib/email";
import { generateReadablePassword } from "../../../../lib/password-generator";
import { addFileReference } from "../../../../lib/gridfs";
import bcrypt from "bcryptjs";

/**
 * Unified User Creation API
 * Creates users with role: admin, contributor, or both
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      name, 
      email, 
      role,
      // Contributor-specific fields
      contributorType,
      branch,
      staffTitle,
      yearOfPassing,
      registerNo,
      avatarUrl,
      profileUrl
    } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Email is optional now, but if provided, must be valid
    if (email && email.trim()) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
      }
      
      // Check if email already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
      }
    }

    // Validate role
    if (!role || !["admin", "contributor", "both"].includes(role)) {
      return NextResponse.json({ error: "Invalid role. Must be 'admin', 'contributor', or 'both'" }, { status: 400 });
    }

    // Validate contributor-specific fields if role includes contributor
    // For admin role, these fields are optional
    if (role === "contributor" || role === "both") {
      if (!contributorType || !["student", "staff"].includes(contributorType)) {
        return NextResponse.json({ error: "User type (student/staff) is required" }, { status: 400 });
      }

      if (contributorType === "student") {
        if (!branch) {
          return NextResponse.json({ error: "Branch is required for students" }, { status: 400 });
        }
        if (!yearOfPassing) {
          return NextResponse.json({ error: "Year of passing is required for students" }, { status: 400 });
        }
        // Register number is now optional
        if (registerNo && !/^\d{14}$/.test(registerNo)) {
          return NextResponse.json({ error: "Register number must be exactly 14 digits" }, { status: 400 });
        }
      }

      if (contributorType === "staff" && !staffTitle) {
        return NextResponse.json({ error: "Staff title is required for staff members" }, { status: 400 });
      }
    }

    // For admin role, validate type fields if provided (optional)
    if (role === "admin" && contributorType) {
      if (!["student", "staff"].includes(contributorType)) {
        return NextResponse.json({ error: "Invalid user type. Must be 'student' or 'staff'" }, { status: 400 });
      }

      if (contributorType === "student") {
        if (!branch) {
          return NextResponse.json({ error: "Branch is required for students" }, { status: 400 });
        }
        if (!yearOfPassing) {
          return NextResponse.json({ error: "Year of passing is required for students" }, { status: 400 });
        }
        // Register number is now optional
        if (registerNo && !/^\d{14}$/.test(registerNo)) {
          return NextResponse.json({ error: "Register number must be exactly 14 digits" }, { status: 400 });
        }
      }

      if (contributorType === "staff" && !staffTitle) {
        return NextResponse.json({ error: "Staff title is required for staff members" }, { status: 400 });
      }
    }

    // Generate a random 8-character readable password
    const password = generateReadablePassword(8);
    const passwordHash = await bcrypt.hash(password, 10);

    // Prepare user data
    const userData: Omit<import("../../../../lib/users").UserDoc, "_id" | "createdAt" | "updatedAt"> = {
      email: email && email.trim() ? email.trim() : `user_${Date.now()}@temp.local`, // Generate temp email if not provided
      passwordHash,
      role: role as "admin" | "contributor" | "both",
      name,
    };

    // Add user type fields if provided (for all roles)
    if (contributorType) {
      userData.contributorType = contributorType as "student" | "staff";
      if (branch) userData.branch = branch as "IT" | "ADS";
      if (staffTitle) {
        userData.staffTitle = staffTitle as "Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department";
      }
      if (yearOfPassing) userData.yearOfPassing = yearOfPassing;
      if (registerNo) userData.registerNo = registerNo;
    }
    
    // Add avatar and profile URLs if provided (for all roles)
    if (avatarUrl) userData.avatarUrl = avatarUrl;
    if (profileUrl) userData.profileUrl = profileUrl;

    // Create the user
    const user = await createUser(userData);

    // Track file references for avatar and profile images
    if (avatarUrl && user._id) {
      const avatarFileId = avatarUrl.replace("/api/media/", "");
      await addFileReference(avatarFileId, user._id, "user_avatar");
    }
    
    // Check if profileUrl is a GridFS file (starts with /api/media/)
    // Otherwise, it's an external URL and doesn't need tracking
    if (profileUrl && profileUrl.startsWith("/api/media/") && user._id) {
      const profileFileId = profileUrl.replace("/api/media/", "");
      await addFileReference(profileFileId, user._id, "user_profile");
    }

    // Send credentials via email based on role (only if email is provided)
    let emailResult;
    const hasValidEmail = email && email.trim() && !email.includes('@temp.local');
    
    if (hasValidEmail) {
      if (role === "admin") {
        emailResult = await sendAdminCredentials(email, name, password);
      } else if (role === "contributor") {
        emailResult = await sendContributorCredentials(email, name, password);
      } else if (role === "both") {
        emailResult = await sendDualRoleCredentials(email, name, password);
      }

      if (!emailResult?.success) {
        console.error("Failed to send credentials email:", emailResult?.error);
        return NextResponse.json({ 
          success: true,
          warning: "User created successfully, but failed to send credentials email. Please notify the user manually.",
          user: { 
            id: user._id, 
            email: user.email, 
            name: user.name,
            role: user.role 
          },
          password // Return password so admin can manually share it
        }, { status: 201 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `User created successfully and credentials sent to ${email}`,
        user: { 
          id: user._id, 
          email: user.email, 
          name: user.name,
          role: user.role 
        }
      });
    } else {
      // No email provided or temp email
      return NextResponse.json({ 
        success: true, 
        message: "User created successfully. No email was provided so credentials were not sent.",
        user: { 
          id: user._id, 
          email: user.email, 
          name: user.name,
          role: user.role 
        },
        password // Return password so admin can manually share it
      }, { status: 201 });
    }

  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ 
      error: "Failed to create user",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Get all users (with optional filtering)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const emailFilter = searchParams.get('email');
    
    let users = await listContributors(); // This now returns users with contributor or both role
    
    // Additional filtering if needed
    if (roleFilter && ["admin", "contributor", "both"].includes(roleFilter)) {
      users = users.filter((u: UserDoc) => u.role === roleFilter);
    }
    
    if (emailFilter) {
      users = users.filter((u: UserDoc) => u.email === emailFilter);
    }
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ 
      error: "Failed to fetch users" 
    }, { status: 500 });
  }
}
