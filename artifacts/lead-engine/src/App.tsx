import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe, ApiError } from "@workspace/api-client-react";

import NotFound from "@/pages/not-found";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MainLayout } from "@/components/Layout";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import LeadDetail from "@/pages/LeadDetail";
import Pipeline from "@/pages/Pipeline";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Settings from "@/pages/Settings";
import Users from "@/pages/Users";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe();

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      setLocation("/login");
    } else if (!isLoading && user && adminOnly && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, isLoading, error, setLocation, adminOnly]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user || error) return null;
  if (adminOnly && user.role !== "admin") return null;

  return <Component />;
}

const wrap = (Component: React.ComponentType, adminOnly = false) => () => (
  <ProtectedRoute component={() => <MainLayout><Component /></MainLayout>} adminOnly={adminOnly} />
);

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={wrap(Dashboard)} />
      <Route path="/leads" component={wrap(Leads)} />
      <Route path="/leads/:id" component={wrap(LeadDetail)} />
      <Route path="/pipeline" component={wrap(Pipeline)} />
      <Route path="/clients" component={wrap(Clients, true)} />
      <Route path="/clients/:id" component={wrap(ClientDetail, true)} />
      <Route path="/admin/users" component={wrap(Users, true)} />
      <Route path="/settings" component={wrap(Settings)} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
