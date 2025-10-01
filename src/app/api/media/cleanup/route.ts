import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { cleanupOrphanedFiles } from "../../../../lib/gridfs";

/**
 * API endpoint to cleanup orphaned files in GridFS
 * Only accessible by admin users
 */
export async function POST(req: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;
  if (!session || !userRole || (userRole !== "admin" && userRole !== "both")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupOrphanedFiles();
    return NextResponse.json({ 
      success: true, 
      message: `Cleanup completed. Deleted ${result.deletedFiles} orphaned files.`,
      deletedFiles: result.deletedFiles
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ 
      error: "Cleanup failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
