import NextAuth, { NextAuthOptions, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword } from "../../../../lib/users";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials) return null;
        const user = await findUserByEmail(credentials.username);
        if (!user) return null;
        const ok = await verifyPassword(credentials.password, user.passwordHash);
        if (!ok) return null;

        // Determine which panel they're trying to access
        let requestedPanel = "";
        if (req && req.headers && req.headers.referer) {
          const url = new URL(req.headers.referer);
          const path = url.pathname;
          if (path.includes("/admin/login")) requestedPanel = "admin";
          else if (path.includes("/contributor/login")) requestedPanel = "contributor";
        }

        // Check if user has access to the requested panel
        // "both" role can access both panels
        // "admin" role can only access admin panel
        // "contributor" role can only access contributor panel
        if (requestedPanel === "admin" && user.role !== "admin" && user.role !== "both") {
          return null; // No access
        }
        if (requestedPanel === "contributor" && user.role !== "contributor" && user.role !== "both") {
          return null; // No access
        }

        return { 
          id: user._id, 
          name: user.name || user.email, 
          email: user.email, 
          role: user.role 
        } as User;
      },
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: { signIn: "/admin/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };



