import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getSidebarDefaultOpen, SIDEBAR_COOKIE_NAME } from "@/lib/sidebar-preference";
import { auth } from "@/server/auth";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.platformRole !== "super_admin" || session.user.isActingAs) {
    redirect("/dashboard");
  }

  return (
    <AppShell
      context={{ kind: "platform", label: "Plataforma", isActingAs: false }}
      defaultOpen={getSidebarDefaultOpen(cookieStore.get(SIDEBAR_COOKIE_NAME)?.value)}
      user={{
        name: session.user.name ?? "Super admin",
        email: session.user.email ?? "",
        image: session.user.image,
      }}
    >
      {children}
    </AppShell>
  );
}
