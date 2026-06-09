import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  LogOut,
  Kanban,
  UserCog,
} from "lucide-react";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { LEMarkBadge } from "@/components/Logo";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
}

function buildNavItems(role: string | undefined): NavItem[] {
  const items: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Leads", url: "/leads", icon: Users },
    { title: "Pipeline", url: "/pipeline", icon: Kanban },
  ];
  if (role === "admin") {
    items.push({ title: "Workspaces", url: "/clients", icon: Building2 });
    items.push({ title: "Users", url: "/admin/users", icon: UserCog });
  }
  items.push({ title: "Settings", url: "/settings", icon: Settings });
  return items;
}

export function MainLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/login");
      },
    });
  };

  const navItems = buildNavItems(user?.role);
  const mobileNavItems = navItems.filter((n) => ["Dashboard", "Leads", "Pipeline", "Settings"].includes(n.title));

  const initials = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <SidebarProvider>
    <div className="flex h-screen w-full overflow-hidden bg-background">

      {/* ── Desktop sidebar ── */}
      <Sidebar className="border-r border-white/[0.06] bg-sidebar text-sidebar-foreground hidden md:flex">
        <SidebarHeader className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <LEMarkBadge size={32} />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] tracking-tight">
                <span className="text-sidebar-foreground">Lead</span>
                <span style={{ color: "#2563EB" }}>Engine</span>
              </span>
              <span className="text-[9px] font-semibold tracking-[0.2em] uppercase text-sidebar-foreground/40 mt-0.5">
                by Novenworks
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest px-3">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.startsWith(item.url) && item.url !== "#"}>
                      <Link href={item.url} className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        </SidebarContent>

        <SidebarFooter className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] text-blue-300"
              style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">
                {user?.role === "admin" ? "Admin · Novenworks" : user?.clientName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0 h-7 w-7"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div
          className="md:hidden flex items-center justify-between px-4 py-3 shrink-0"
          style={{ background: "#0B1220", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="text-white/60 hover:text-white" />
            <div className="flex items-center gap-2">
              <LEMarkBadge size={24} />
              <span className="font-bold text-sm text-white">
                Lead<span style={{ color: "#2563EB" }}>Engine</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-300"
              style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)" }}>
              {initials}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </div>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
          style={{ background: "#0B1220", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          {mobileNavItems.map((item) => {
            const isActive = location.startsWith(item.url);
            return (
              <Link
                key={item.title}
                href={item.url}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[11px] font-medium transition-colors min-h-[56px]",
                  isActive ? "text-blue-400" : "text-white/30 hover:text-white/60"
                )}
              >
                <item.icon className={cn("h-[19px] w-[19px]", isActive ? "text-blue-400" : "text-white/30")} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
    </SidebarProvider>
  );
}
