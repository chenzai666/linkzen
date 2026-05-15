import authConfig from "@/auth.config";

import NextAuth, { type DefaultSession } from "next-auth";

import { getUserById } from "@/lib/dto/user";

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      active: number;
      apiKey: string;
    } & DefaultSession["user"];
  }
}

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ token, session }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (token.email) session.user.email = token.email;
        if (token.role) session.user.role = token.role as string;
        session.user.name = token.name;
        session.user.active = token.active as number;
        session.user.apiKey = token.apiKey as string;
      }
      return session;
    },
    async jwt({ token }) {
      if (!token.sub) return token;
      const dbUser = await getUserById(token.sub);
      if (!dbUser) return token;
      token.name = dbUser.name;
      token.email = dbUser.email;
      token.role = dbUser.role;
      token.active = dbUser.active;
      token.apiKey = dbUser.apiKey;
      return token;
    },
  },
  ...authConfig,
});
