import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getSidebarDefaultOpen, SIDEBAR_COOKIE_NAME } from "@/lib/sidebar-preference";
import { auth } from "@/server/auth";
import { getCompanyById } from "@/server/dal/companies";
import { getCurrentContext } from "@/server/dal/context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  if (!session?.user) {
    redirect("/login");
  }

  const ctx = await getCurrentContext();

  if (session.user.platformRole === "super_admin" && !session.user.isActingAs) {
    redirect("/platform/companies");
  }

  if (!ctx || ctx.kind !== "company") {
    redirect("/login");
  }

  const company = await getCompanyById(ctx.companyId);

  return (
    <AppShell
      context={{
        kind: "company",
        label: company?.name ?? "Área da empresa",
        isActingAs: session.user.isActingAs,
      }}
      defaultOpen={getSidebarDefaultOpen(cookieStore.get(SIDEBAR_COOKIE_NAME)?.value)}
      user={{
        name: session.user.name ?? "Usuário",
        email: session.user.email ?? "",
        image: session.user.image,
      }}
    >
      {children}
    </AppShell>
  );
}
