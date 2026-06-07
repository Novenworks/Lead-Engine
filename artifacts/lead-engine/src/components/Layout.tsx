import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  LogOut,
  Kanban,
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
}

function buildNavItems(role: string | undefined): NavItem[] {
  const items: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Leads", url: "/leads", icon: Users },
    { title: "Pipeline", url: "/pipeline", icon: Kanban },
  ];
  if (role === "admin") {
    items.push({ title: "Clients", url: "/clients", icon: Building2 });
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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar className="border-r bg-sidebar text-sidebar-foreground hidden md:flex">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <LEMarkBadge size={32} />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-base tracking-tight">
                <span className="text-sidebar-foreground">Lead</span>
                <span style={{ color: "#2563EB" }}>Engine</span>
              </span>
              <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-sidebar-foreground/50 mt-0.5">by Novenworks</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.startsWith(item.url)}>
                      <Link href={item.url} className="flex items-center gap-2">
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
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-blue-400 uppercase">
                {user?.name?.charAt(0) ?? "?"}
              </span>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <span className="text-xs font-medium truncate">{user?.name}</span>
              <span className="text-[10px] text-sidebar-foreground/50 truncate">
                {user?.role === "admin" ? "Admin · Novenworks" : user?.clientName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0 h-7 w-7"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <LEMarkBadge size={24} />
              <span className="font-bold text-sm">
                <span>Lead</span><span style={{ color: "#2563EB" }}>Engine</span>
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40 flex items-stretch">
          {mobileNavItems.map((item) => {
            const isActive = location.startsWith(item.url);
            return (
              <Link
                key={item.title}
                href={item.url}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors min-h-[56px]",
                  isActive
                    ? "text-primary bg-primary/5"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-slate-400")} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
