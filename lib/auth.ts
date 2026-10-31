import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<{ id: string; email: string; name: string; role: "CUSTOMER" | "OWNER" } | null> {
  if (!credentials?.email || !credentials?.password) return null;
  const email = credentials.email.toLowerCase().trim();

  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  const ownerPassword = process.env.OWNER_PASSWORD;
  if (ownerEmail && ownerPassword && email === ownerEmail) {
    if (credentials.password === ownerPassword) {
      return { id: "owner", email: ownerEmail, name: ownerEmail, role: "OWNER" };
    }
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const valid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, email: user.email, name: user.email, role: user.role as "CUSTOMER" | "OWNER" };
}
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
