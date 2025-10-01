import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Get the unified session token
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token'
  });

  // Redirect login page if already authenticated
  if (path === "/login") {
    if (token) {
      const role = token.role as string;
      // Redirect based on role
      if (role === "admin" || role === "both") {
        return NextResponse.redirect(new URL("/admin", req.url));
      } else if (role === "contributor") {
        return NextResponse.redirect(new URL("/contributor/dashboard", req.url));
      }
    }
  }

  // Redirect old login pages to unified login
  if (path === "/admin/login" || path === "/contributor/login") {
    const redirectUrl = new URL("/login", req.url);
    // Preserve callbackUrl if present
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    if (callbackUrl) {
      redirectUrl.searchParams.set("callbackUrl", callbackUrl);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Admin panel routes protection
  if (path.startsWith("/admin") && !path.startsWith("/admin/login") && !path.startsWith("/admin/forgot-password") && !path.startsWith("/admin/create-admin")) {
    if (!token) {
      const redirectUrl = new URL("/login", req.url);
      redirectUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(redirectUrl);
    }
    
    const role = token.role as string;
    
    // Only admin and "both" roles can access admin panel
    if (role !== "admin" && role !== "both") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Contributor panel routes protection
  if (path.startsWith("/contributor") && !path.startsWith("/contributor/login") && !path.startsWith("/contributor/forgot-password")) {
    if (!token) {
      const redirectUrl = new URL("/login", req.url);
      redirectUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(redirectUrl);
    }
    
    const role = token.role as string;
    
    // Only contributor and "both" roles can access contributor panel
    if (role !== "contributor" && role !== "both") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // API route protection
  if (path.startsWith("/api/users") && !path.includes("/public-info") && !path.includes("/register")) {
    const role = token?.role as string;
    if (!token || (role !== "admin" && role !== "both")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (path.startsWith("/api/projects") && req.method !== "GET") {
    // Both admin and contributor (and "both") can modify projects
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const role = token.role as string;
    if (role !== "admin" && role !== "contributor" && role !== "both") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (path.startsWith("/api/contributors") && req.method !== "GET") {
    const role = token?.role as string;
    if (!token || (role !== "admin" && role !== "both")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (path.startsWith("/api/media/upload") || path.startsWith("/api/media/delete")) {
    // Both admin and contributor can upload/delete media
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const role = token.role as string;
    if (role !== "admin" && role !== "contributor" && role !== "both") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/contributor/:path*",
    "/api/users/:path*",
    "/api/projects/:path*",
    "/api/contributors/:path*",
    "/api/media/:path*",
  ],
};
