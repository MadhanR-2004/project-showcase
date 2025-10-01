import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "admin" | "contributor" | "both";
    loginContext?: "admin" | "contributor"; // Track which panel they logged in from
  }

  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "admin" | "contributor" | "both";
      loginContext?: "admin" | "contributor"; // Track which panel they're using
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "contributor" | "both";
    loginContext?: "admin" | "contributor";
  }
}
