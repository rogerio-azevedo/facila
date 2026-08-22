import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getSidebarDefaultOpen, SIDEBAR_COOKIE_NAME } from "@/lib/sidebar-preference";
import { auth } from "@/server/auth";
import { getClientById } from "@/server/dal/clients";
import { getCurrentContext } from "@/server/dal/context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  if (!session?.user) {
    redirect("/login");
  }

  const ctx = await getCurrentContext();

  if (session.user.platformRole === "super_admin" && !session.user.isActingAs) {
    redirect("/platform/clients");
  }

  if (!ctx || ctx.kind !== "client") {
    redirect("/login");
  }

  const client = await getClientById(ctx.clientId);

  return (
    <AppShell
      context={{
        kind: "client",
        label: client?.name ?? "Área do cliente",
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
