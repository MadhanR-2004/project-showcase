import NextAuth, { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword } from "../../../../lib/users";

interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ExtendedToken {
  role: string;
}

interface ExtendedSession {
  user: {
    role: string;
  };
}

const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const user = await findUserByEmail(credentials.username);
        if (!user) return null;
        const ok = await verifyPassword(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user._id, name: user.name || user.email, email: user.email, role: user.role } as ExtendedUser;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as JWT & ExtendedToken).role = (user as ExtendedUser).role;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as ExtendedSession['user'] & { role: string }).role = (token as JWT & ExtendedToken).role;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };



