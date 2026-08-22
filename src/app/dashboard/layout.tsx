import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { auth } from "@/server/auth";
import { getClientById } from "@/server/dal/clients";
import { getCurrentContext } from "@/server/dal/context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
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
      userName={session.user.name ?? "Usuário"}
      userEmail={session.user.email ?? ""}
      platformRole={session.user.platformRole}
      isActingAs={session.user.isActingAs}
      clientName={client?.name}
    >
      {children}
    </AppShell>
  );
}
