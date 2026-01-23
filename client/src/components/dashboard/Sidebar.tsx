import { Link, useLocation } from "wouter";
import { LayoutDashboard, Wifi, PieChart, Settings, Lock, LogOut, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Wifi, label: "Devices", href: "/devices" },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-sidebar border-r border-sidebar-border/50 hidden md:flex flex-col p-6 z-50">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap className="w-6 h-6 text-primary-foreground fill-current" />
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight text-white">IoT Nexus</h1>
          <p className="text-xs text-sidebar-foreground">Control Center</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm uppercase">
          {user?.username.substring(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{user?.fullName || user?.username}</p>
          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{user?.role || "USER"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-sidebar-accent text-white shadow-md shadow-black/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-primary"
                  )}
                />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => logoutMutation.mutate()}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors mt-auto group"
      >
        <LogOut className="w-5 h-5 group-hover:text-destructive transition-colors" />
        <span className="font-medium text-sm">Logout</span>
      </button>
    </aside>
  );
}
