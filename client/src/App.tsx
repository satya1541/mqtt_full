import React, { Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import { ThemeProvider } from "@/components/theme-provider";

const NotFound = React.lazy(() => import("@/pages/not-found"));
const Dashboard = React.lazy(() => import("@/pages/dashboard"));
const DevicesPage = React.lazy(() => import("@/pages/devices"));
const MetadataPage = React.lazy(() => import("@/pages/metadata"));
const AuthPage = React.lazy(() => import("@/pages/auth-page"));

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType<any>, path: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return <Route path={path} component={AuthPage} />;
  }

  return <Route path={path} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/devices" component={DevicesPage} />
      <Route path="/md" component={MetadataPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <Router />
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
