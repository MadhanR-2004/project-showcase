import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "admin" | "contributor" | "both";
  }

  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "admin" | "contributor" | "both";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "contributor" | "both";
  }
}
