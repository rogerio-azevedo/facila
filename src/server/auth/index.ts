import "server-only";

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { db } from "@/server/db";
import { accounts, users } from "@/server/db/schema";
import { loginSchema } from "@/schemas/auth";
import { listMembershipsByUserId } from "@/server/dal/company-members";
import { resolveSessionCompanyContext } from "@/server/dal/session";

import { authConfig } from "./auth.config";

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        });

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        const companyContext = await resolveSessionCompanyContext(user);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          platformRole: user.platformRole,
          ...companyContext,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
      if (superAdminEmail && user.email.toLowerCase() === superAdminEmail) {
        await db
          .update(users)
          .set({ platformRole: "super_admin" })
          .where(eq(users.email, user.email));
      }

      if (account?.provider === "google") {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });

        if (!existing) {
          return "/register?error=google-new-user";
        }

        if (existing.platformRole !== "super_admin") {
          const memberships = await listMembershipsByUserId(existing.id);

          if (memberships.length === 0) {
            return "/register?error=no-company";
          }
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });

        if (dbUser) {
          const companyContext = await resolveSessionCompanyContext(dbUser, {
            activeCompanyId: user.activeCompanyId,
            isActingAs: user.isActingAs,
          });

          token.userId = dbUser.id;
          token.platformRole = dbUser.platformRole;
          token.activeCompanyId = companyContext.activeCompanyId;
          token.companyRole = companyContext.companyRole;
          token.isActingAs = companyContext.isActingAs;
        }
      } else if (token.userId && trigger !== "update") {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.userId as string),
        });

        if (dbUser) {
          token.platformRole = dbUser.platformRole;
          const companyContext = await resolveSessionCompanyContext(dbUser, {
            activeCompanyId: token.activeCompanyId as string | null | undefined,
            isActingAs: Boolean(token.isActingAs),
          });
          token.activeCompanyId = companyContext.activeCompanyId;
          token.companyRole = companyContext.companyRole;
          token.isActingAs = companyContext.isActingAs;
        }
      }

      if (trigger === "update" && session?.user) {
        if ("activeCompanyId" in session.user) {
          token.activeCompanyId = session.user.activeCompanyId ?? null;
        }
        if ("companyRole" in session.user) {
          token.companyRole = session.user.companyRole ?? null;
        }
        if ("isActingAs" in session.user) {
          token.isActingAs = session.user.isActingAs ?? false;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.platformRole = (token.platformRole as "user" | "super_admin") ?? "user";
        session.user.activeCompanyId = (token.activeCompanyId as string | null) ?? null;
        session.user.companyRole = (token.companyRole as "admin" | "member" | null) ?? null;
        session.user.isActingAs = Boolean(token.isActingAs);
      }

      return session;
    },
  },
});

export type AppSession = Awaited<ReturnType<typeof auth>>;
