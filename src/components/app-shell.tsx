"use client";

import { usePathname } from "next/navigation";

import { AppSidebar, getNavigationItem } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  SidebarStoreProvider,
  useSidebarStore,
} from "@/stores/sidebar-provider";

export type AppShellUser = {
  name: string;
  email: string;
  image?: string | null;
};

export type AppShellContext =
  | {
      kind: "client";
      label: string;
      isActingAs: boolean;
    }
  | {
      kind: "platform";
      label: "Plataforma";
      isActingAs: false;
    };

type AppShellProps = {
  children: React.ReactNode;
  context: AppShellContext;
  defaultOpen: boolean;
  user: AppShellUser;
};

function AppHeader({ context }: { context: AppShellContext }) {
  const pathname = usePathname();
  const { isMobile, open, openMobile } = useSidebar();
  const activeItem = getNavigationItem(context.kind, pathname);
  const isActingAs = context.kind === "client" && context.isActingAs;
  const isOpen = isMobile ? openMobile : open;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-background/95 px-3 backdrop-blur-sm md:px-5">
      <SidebarTrigger
        aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
        aria-expanded={isOpen}
        title={isOpen ? "Recolher menu" : "Expandir menu"}
        className="size-8"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {activeItem?.label ?? "Facila"}
        </p>
        <p className="truncate text-xs text-muted-foreground">{context.label}</p>
      </div>
      {isActingAs ? (
        <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          Suporte
        </div>
      ) : null}
    </header>
  );
}

function AppShellContent({
  children,
  context,
  user,
}: Omit<AppShellProps, "defaultOpen">) {
  const open = useSidebarStore((state) => state.isOpen);
  const setOpen = useSidebarStore((state) => state.setOpen);

  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      style={
        {
          "--sidebar-width": "16.5rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar context={context} user={user} />
      <SidebarInset className="min-w-0">
        <AppHeader context={context} />
        <div className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell({ children, context, defaultOpen, user }: AppShellProps) {
  return (
    <SidebarStoreProvider defaultOpen={defaultOpen}>
      <AppShellContent context={context} user={user}>
        {children}
      </AppShellContent>
    </SidebarStoreProvider>
  );
}
