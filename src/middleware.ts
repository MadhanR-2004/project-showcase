import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Admin panel routes
  if (path.startsWith("/admin") && !path.startsWith("/admin/login") && !path.startsWith("/admin/forgot-password") && !path.startsWith("/admin/create-admin")) {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.admin-session' 
        : 'next-auth.admin-session'
    });
    
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    
    const role = token.role as string;
    if (role !== "admin" && role !== "both") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Contributor panel routes
  if (path.startsWith("/contributor") && !path.startsWith("/contributor/login") && !path.startsWith("/contributor/forgot-password")) {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.contributor-session' 
        : 'next-auth.contributor-session'
    });
    
    if (!token) {
      return NextResponse.redirect(new URL("/contributor/login", req.url));
    }
    
    const role = token.role as string;
    if (role !== "contributor" && role !== "both") {
      return NextResponse.redirect(new URL("/contributor/login", req.url));
    }
  }

  // API route protection
  if (path.startsWith("/api/users") && !path.includes("/public-info") && !path.includes("/register")) {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.admin-session' 
        : 'next-auth.admin-session'
    });
    
    const role = token?.role as string;
    if (!token || (role !== "admin" && role !== "both")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (path.startsWith("/api/projects") && req.method !== "GET") {
    // Check both admin and contributor tokens
    const adminToken = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.admin-session' 
        : 'next-auth.admin-session'
    });
    
    const contributorToken = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.contributor-session' 
        : 'next-auth.contributor-session'
    });
    
    if (!adminToken && !contributorToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (path.startsWith("/api/contributors") && req.method !== "GET") {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.admin-session' 
        : 'next-auth.admin-session'
    });
    
    const role = token?.role as string;
    if (!token || (role !== "admin" && role !== "both")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (path.startsWith("/api/media/upload") || path.startsWith("/api/media/delete")) {
    // Check both admin and contributor tokens
    const adminToken = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.admin-session' 
        : 'next-auth.admin-session'
    });
    
    const contributorToken = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.contributor-session' 
        : 'next-auth.contributor-session'
    });
    
    if (!adminToken && !contributorToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

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
