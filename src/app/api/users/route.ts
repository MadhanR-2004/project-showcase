import { NextResponse } from "next/server";
import { listUsers } from "../../../lib/users";

/**
 * GET /api/users - List all users
 */
export async function GET() {
  try {
    const users = await listUsers();
    
    // Remove password hashes from response
    const sanitizedUsers = users.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    return NextResponse.json({ 
      success: true, 
      users: sanitizedUsers 
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ 
      error: "Failed to fetch users",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
