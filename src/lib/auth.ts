// Configuration de NextAuth v5
// NextAuth = bibliothèque d'authentification pour Next.js
// Gère sessions, cookies, JWT, etc. de manière sécurisée

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            username: true,
            passwordHash: true,
            emailVerified: true,
            isBanned: true,
            role: true,
          },
        });

        if (!user) {
          await bcrypt.compare(password, "$2a$10$invalidhashforconstantcomparison");
          return null;
        }

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        if (user.isBanned) {
          throw new Error("ACCOUNT_BANNED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // À la connexion initiale, on enrichit le token
      if (user) {
        token.id = user.id;
        token.username = user.name;
        token.role = (user as any).role;
        token.emailVerified = (user as any).emailVerified;
      }

      // Mise à jour manuelle via useSession().update()
      // Appelée depuis la page /verify-email après succès
      if (trigger === "update" && session) {
        if (session.emailVerified !== undefined) {
          token.emailVerified = session.emailVerified;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as any;
        session.user.emailVerified = token.emailVerified as Date | null;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-anonrp.session-token"
          : "anonrp.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  trustHost: true,
});
