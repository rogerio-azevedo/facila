import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    platformRole?: "user" | "super_admin";
    activeCompanyId?: string | null;
    companyRole?: "admin" | "member" | null;
    isActingAs?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      platformRole: "user" | "super_admin";
      activeCompanyId: string | null;
      companyRole: "admin" | "member" | null;
      isActingAs: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    platformRole?: "user" | "super_admin";
    activeCompanyId?: string | null;
    companyRole?: "admin" | "member" | null;
    isActingAs?: boolean;
  }
}

export {};
