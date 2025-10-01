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
        let requestedPanel: "admin" | "contributor" | "" = "";
        if (req && req.headers && req.headers.referer) {
          const url = new URL(req.headers.referer);
          const path = url.pathname;
          if (path.includes("/admin/login")) requestedPanel = "admin";
          else if (path.includes("/contributor/login")) requestedPanel = "contributor";
        }

        // Check if user has access to the requested panel
        if (requestedPanel === "admin") {
          if (user.role !== "admin" && user.role !== "both") {
            return null; // No access to admin panel
          }
        }
        if (requestedPanel === "contributor") {
          if (user.role !== "contributor" && user.role !== "both") {
            return null; // No access to contributor panel
          }
        }

        return { 
          id: user._id, 
          name: user.name || user.email, 
          email: user.email, 
          role: user.role,
          loginContext: requestedPanel || undefined
        } as User;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '').split('/')[0]
          : undefined,
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  pages: { 
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.loginContext = user.loginContext;
        token.sub = user.id; // Store user ID in token
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.loginContext = token.loginContext;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };



