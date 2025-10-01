import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin panel routes
    if (path.startsWith("/admin") && !path.startsWith("/admin/login") && !path.startsWith("/admin/forgot-password")) {
      const role = token?.role as string;
      // Allow access if user has admin or both role
      if (role !== "admin" && role !== "both") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    // Contributor panel routes
    if (path.startsWith("/contributor") && !path.startsWith("/contributor/login") && !path.startsWith("/contributor/forgot-password")) {
      const role = token?.role as string;
      // Allow access if user has contributor or both role
      if (role !== "contributor" && role !== "both") {
        return NextResponse.redirect(new URL("/contributor/login", req.url));
      }
    }

    // API route protection
    if (path.startsWith("/api/users") && !path.includes("/public-info") && !path.includes("/register")) {
      const role = token?.role as string;
      if (role !== "admin" && role !== "both") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (path.startsWith("/api/projects") && req.method !== "GET") {
      // Allow GET for public viewing, protect PUT/POST/DELETE
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (path.startsWith("/api/contributors") && req.method !== "GET") {
      const role = token?.role as string;
      if (role !== "admin" && role !== "both") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (path.startsWith("/api/media/upload") || path.startsWith("/api/media/delete")) {
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Allow public routes
        if (
          path.startsWith("/admin/login") ||
          path.startsWith("/admin/forgot-password") ||
          path.startsWith("/contributor/login") ||
          path.startsWith("/contributor/forgot-password") ||
          path.startsWith("/api/admin/forgot-password") ||
          path.startsWith("/api/admin/verify-otp") ||
          path.startsWith("/api/admin/reset-password") ||
          path.startsWith("/api/auth") ||
          path.startsWith("/projects") ||
          path === "/" ||
          path.startsWith("/_next") ||
          path.startsWith("/favicon")
        ) {
          return true;
        }

        // Require token for protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/contributor/:path*",
    "/api/users/:path*",
    "/api/projects/:path*",
    "/api/contributors/:path*",
    "/api/media/:path*",
  ],
};
