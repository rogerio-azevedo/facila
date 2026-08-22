import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/actions/auth";
import { auth } from "@/server/auth";
import { Button } from "@/components/ui/button";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.platformRole !== "super_admin" || session.user.isActingAs) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Facila Plataforma</span>
          <Link href="/platform/clients" className="text-sm text-muted-foreground hover:text-foreground">
            Clientes
          </Link>
        </div>
        <form action={logoutAction}>
          <Button variant="outline" size="sm" type="submit">
            Sair
          </Button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
