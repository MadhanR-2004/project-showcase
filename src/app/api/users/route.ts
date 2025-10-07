import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { listUsers } from "../../../lib/users";
import { getDb } from "../../../lib/mongodb";

/**
 * GET /api/users - List all users with pagination support
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 1000);
    const skip = Number(searchParams.get("skip") ?? 0);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    const db = await getDb();
    
    // Build query with search and role filter
    interface QueryFilter {
      $or?: Array<{
        name?: { $regex: string; $options: string };
        email?: { $regex: string; $options: string };
        branch?: { $regex: string; $options: string };
        staffTitle?: { $regex: string; $options: string };
      }>;
      role?: string;
    }
    
    const query: QueryFilter = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { branch: { $regex: search, $options: "i" } },
        { staffTitle: { $regex: search, $options: "i" } }
      ];
    }
    
    if (role && role !== "all") {
      query.role = role;
    }

    // Get total count with filters
    const total = await db.collection("users").countDocuments(query);

    // Get users with pagination and filters
    const users = await db.collection("users")
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Remove password hashes from response
    const sanitizedUsers = users.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    return NextResponse.json({ 
      success: true, 
      users: sanitizedUsers,
      total
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ 
      error: "Failed to fetch users",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
