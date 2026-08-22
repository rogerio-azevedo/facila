"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/actions/auth";
import { stopActAsClientAction } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar";

type AppShellProps = {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  platformRole: "user" | "super_admin";
  isActingAs: boolean;
  clientName?: string;
};

const navItems = [{ href: "/dashboard", label: "Dashboard" }];

export function AppShell({
  children,
  userName,
  userEmail,
  platformRole,
  isActingAs,
  clientName,
}: AppShellProps) {
  const pathname = usePathname();
  const { isOpen, toggle } = useSidebarStore();

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "border-r bg-card transition-all duration-200",
          isOpen ? "w-64" : "w-16",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          {isOpen ? (
            <span className="font-semibold">Facila</span>
          ) : (
            <span className="font-semibold">F</span>
          )}
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar menu">
            {isOpen ? "←" : "→"}
          </Button>
        </div>
        <nav className="space-y-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm hover:bg-accent",
                pathname === item.href && "bg-accent font-medium",
              )}
            >
              {isOpen ? item.label : item.label[0]}
            </Link>
          ))}
          {platformRole === "super_admin" && !isActingAs && (
            <Link
              href="/platform/clients"
              className={cn(
                "block rounded-md px-3 py-2 text-sm hover:bg-accent",
                pathname.startsWith("/platform") && "bg-accent font-medium",
              )}
            >
              {isOpen ? "Plataforma" : "P"}
            </Link>
          )}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div>
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">
              {clientName ? `${clientName}${isActingAs ? " (suporte)" : ""}` : userEmail}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isActingAs && (
              <form action={stopActAsClientAction}>
                <Button variant="outline" size="sm" type="submit">
                  Sair do modo suporte
                </Button>
              </form>
            )}
            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
