import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUser, deleteUser } from "../../../../lib/users";
import { sendAdminCredentials, sendContributorCredentials, sendDualRoleCredentials } from "../../../../lib/email";

// GET single user by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUserById(id);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;
    
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ 
      error: "Failed to fetch user" 
    }, { status: 500 });
  }
}

// UPDATE user
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { 
      name,
      email, 
      role,
      contributorType,
      branch,
      staffTitle,
      yearOfPassing,
      registerNo,
      avatarUrl,
      profileUrl
    } = body;

    // Get existing user to check for role changes and email changes
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const roleChanged = existingUser.role !== role;
    const emailChanged = existingUser.email !== email;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    
    // Validate email if provided and changed
    if (email && email.trim() && emailChanged) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
      }
      
      // Check if email already exists for another user
      const { findUserByEmail } = await import("../../../../lib/users");
      const userWithEmail = await findUserByEmail(email);
      if (userWithEmail && userWithEmail._id !== id) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
      }
    }

    if (!role || !["admin", "contributor", "both"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Validate contributor-specific fields if role includes contributor
    // For admin role, these fields are optional
    if (role === "contributor" || role === "both") {
      if (!contributorType || !["student", "staff"].includes(contributorType)) {
        return NextResponse.json({ error: "User type is required" }, { status: 400 });
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

    // Prepare update data - Allow empty strings to clear avatar/profile URLs
    const updateData: {
      name: string;
      email?: string;
      role: "admin" | "contributor" | "both";
      contributorType?: "student" | "staff";
      branch?: "IT" | "ADS";
      staffTitle?: "Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department";
      yearOfPassing?: string;
      registerNo?: string;
      avatarUrl?: string;
      profileUrl?: string;
    } = {
      name,
      role: role as "admin" | "contributor" | "both",
      // Allow empty strings to explicitly clear the URLs
      avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
      profileUrl: profileUrl !== undefined ? profileUrl : undefined,
    };
    
    // Include email if provided
    if (email && email.trim()) {
      updateData.email = email.trim();
    }
    
    console.log("Update request - avatarUrl:", avatarUrl, "profileUrl:", profileUrl);
    console.log("updateData:", JSON.stringify(updateData, null, 2));

    // Add user type fields for all roles (if provided)
    // For contributor/both roles, these are required; for admin, they're optional
    if (contributorType) {
      updateData.contributorType = contributorType as "student" | "staff";
      if (branch) updateData.branch = branch as "IT" | "ADS";
      if (staffTitle) {
        updateData.staffTitle = staffTitle as "Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department";
      }
      if (yearOfPassing) updateData.yearOfPassing = yearOfPassing;
      if (registerNo) updateData.registerNo = registerNo;
    } else if (role === "admin") {
      // If admin role and no contributorType provided, explicitly clear these fields
      updateData.contributorType = undefined;
      updateData.branch = undefined;
      updateData.staffTitle = undefined;
      updateData.yearOfPassing = undefined;
      updateData.registerNo = undefined;
    }

    const updatedUser = await updateUser(id, updateData);
    
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Send email notification if role changed or email was added/changed
    const shouldSendEmail = (roleChanged || emailChanged) && email && email.trim();
    
    if (shouldSendEmail) {
      const userName = updatedUser.name || "User";
      let emailResult;
      const isUpdate = true; // This is an update, not a new account
      
      if (role === "admin") {
        emailResult = await sendAdminCredentials(
          email, 
          userName, 
          "", // No password since not creating new account
          isUpdate // Indicate this is a role change/update
        );
      } else if (role === "contributor") {
        emailResult = await sendContributorCredentials(
          email, 
          userName, 
          "", 
          isUpdate
        );
      } else if (role === "both") {
        emailResult = await sendDualRoleCredentials(
          email, 
          userName, 
          "", 
          isUpdate
        );
      }

      if (emailResult && !emailResult.success) {
        console.error("Failed to send notification email:", emailResult.error);
      }
    }

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = updatedUser;

    let message = "User updated successfully";
    if (shouldSendEmail) {
      if (roleChanged && emailChanged) {
        message = "User updated successfully. Role change and email update notification sent.";
      } else if (roleChanged) {
        message = "User updated successfully. Role change notification sent via email.";
      } else if (emailChanged) {
        message = "User updated successfully. Email update notification sent.";
      }
    }

    return NextResponse.json({ 
      success: true, 
      message,
      user: userWithoutPassword,
      roleChanged,
      emailChanged
    });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ 
      error: "Failed to update user",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const success = await deleteUser(id);
    
    if (!success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "User deleted successfully" 
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ 
      error: "Failed to delete user",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
