"use client";

import {
  Building2Icon,
  ChevronUpIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/actions/auth";
import { stopActAsClientAction } from "@/actions/clients";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

import type { AppShellContext, AppShellUser } from "./app-shell";

const navigation = {
  client: [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboardIcon,
    },
  ],
  platform: [
    {
      href: "/platform/clients",
      label: "Clientes",
      icon: Building2Icon,
    },
  ],
} as const;

export function getNavigationItem(area: AppShellContext["kind"], pathname: string) {
  return navigation[area].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "U";
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  context: AppShellContext;
  user: AppShellUser;
};

export function AppSidebar({ context, user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const items = navigation[context.kind];
  const homeHref = items[0].href;
  const isActingAs = context.kind === "client" && context.isActingAs;

  function closeMobileNavigation() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-2 py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Facila"
              className="h-9 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:size-8!"
            >
              <Link href={homeHref} onClick={closeMobileNavigation}>
                <span className="hidden size-8 shrink-0 items-center justify-center group-data-[collapsible=icon]:flex">
                  <Image
                    src="/facila-symbol.svg"
                    alt=""
                    width={24}
                    height={31}
                    priority
                  />
                </span>
                <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <Image
                    src="/facila.svg"
                    alt="Facila"
                    width={96}
                    height={40}
                    className="h-8 w-auto"
                    priority
                  />
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Navegação principal">
          <SidebarGroup className="pt-3">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-10 gap-3 px-3 text-[13px] data-active:bg-sidebar-accent data-active:text-sidebar-primary data-active:shadow-[inset_3px_0_0_var(--sidebar-primary)] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:data-active:shadow-none"
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={closeMobileNavigation}
                        >
                          <item.icon aria-hidden="true" />
                          <span className="group-data-[collapsible=icon]:sr-only">
                            {item.label}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-2.5">
        {isActingAs ? (
          <>
            <div className="flex items-center gap-2 px-2 text-xs font-medium text-amber-700 group-data-[collapsible=icon]:hidden">
              <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
              Modo suporte ativo
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <form action={stopActAsClientAction}>
                  <SidebarMenuButton
                    asChild
                    tooltip="Sair do modo suporte"
                    className="h-10 text-amber-800 hover:bg-amber-50 hover:text-amber-900 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
                  >
                    <button type="submit">
                      <ShieldCheckIcon aria-hidden="true" />
                      <span className="group-data-[collapsible=icon]:sr-only">
                        Sair do modo suporte
                      </span>
                    </button>
                  </SidebarMenuButton>
                </form>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator className="my-0" />
          </>
        ) : null}

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  aria-label={`Abrir menu de ${user.name}`}
                  className="h-12 gap-3 px-2 data-open:bg-sidebar-accent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
                >
                  <Avatar className="size-8 rounded-md" size="default">
                    {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                    <AvatarFallback className="rounded-md bg-navy text-xs font-semibold text-white">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                    <span className="block truncate text-sm font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-sidebar-foreground/55">
                      {user.email}
                    </span>
                  </span>
                  <ChevronUpIcon
                    className="ml-auto size-4 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden"
                    aria-hidden="true"
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "top" : "right"}
                align="end"
                sideOffset={8}
                className="min-w-60"
              >
                <DropdownMenuLabel className="px-2 py-1.5 font-normal">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full px-2 py-2">
                      <LogOutIcon aria-hidden="true" />
                      Sair
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail title="Recolher ou expandir menu" />
    </Sidebar>
  );
}
