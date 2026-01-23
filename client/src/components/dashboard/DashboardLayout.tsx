import { Header } from "@/components/layout/Header";
import { ReactNode } from "react";
import { useLocation } from "wouter";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const isMdPage = location === "/md";

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      {!isMdPage && <Header />}

      {/* Main Content Area */}
      <main className="flex-1 p-3 md:p-6 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto w-full space-y-4 md:space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
