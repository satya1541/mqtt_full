import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
    LayoutDashboard,
    Settings,
    LogOut,
    Wifi,
    FileText,
    Bell,
    Lock,
    Unlock,
    Monitor,
    Menu,
    X,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Info
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { WidgetEditor } from "@/components/dashboard/WidgetEditor";
import { useWidgetPreferences } from "@/hooks/useWidgetPreferences";
import { getQueryFn } from "@/lib/queryClient";
import type { InferredMetadata } from "@/types/shared";

export function Header() {
    const [location] = useLocation();
    const { user, logoutMutation } = useAuth();
    const [time, setTime] = useState(new Date());
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Widget Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const { preferences, savePreferences, resetPreferences } = useWidgetPreferences();

    const queryClient = useQueryClient();

    const { data: notifications = [] } = useQuery<any[]>({
        queryKey: ["/api/notifications"],
    });

    // Fetch active sensor types for the editor
    const { data: activeTypes = [] } = useQuery<InferredMetadata[]>({
        queryKey: ["/api/readings/types"],
        queryFn: getQueryFn({ on401: "throw" })
    });

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries();
        setTimeout(() => {
            setIsRefreshing(false);
            toast.success("Dashboard data refreshed");
        }, 800);
    };

    const navItems = [
        { label: "Dashboard", href: "/" },
        { label: "Devices & Sensors", href: "/devices" },
    ];

    return (
        <>
            <WidgetEditor
                open={editorOpen}
                onOpenChange={setEditorOpen}
                availableSensors={activeTypes}
                preferences={preferences}
                onSave={savePreferences}
                onReset={resetPreferences}
            />

            {/* Lock Screen Overlay */}
            {isLocked && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xl flex flex-col items-center justify-center transition-all duration-500 animate-in fade-in">
                    <div className="p-12 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-6 shadow-2xl">
                        <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary animate-pulse">
                            <Lock className="w-10 h-10" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Workspace Locked</h2>
                            <p className="text-gray-400">Please click below to resume monitoring</p>
                        </div>
                        <button
                            onClick={() => setIsLocked(false)}
                            className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <Unlock className="w-5 h-5" />
                            Unlock Session
                        </button>
                    </div>
                </div>
            )}

            <header className="h-16 bg-[#1a1a1a] border-b border-white/5 px-4 md:px-6 flex items-center justify-between z-50 relative">
                {/* 1. Logo & Division Section - Left */}
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="h-10 w-auto flex items-center justify-center flex-shrink-0">
                        <img src="/logo.png" alt="GMR X CLINO" className="h-full w-auto object-contain" />
                    </div>

                    {/* User Division Badge - Desktop Only */}
                    {user?.division && (
                        <div className="hidden lg:flex items-center ml-6 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]">
                            <span className="text-xl font-black tracking-wide uppercase">
                                {user.division}
                            </span>
                        </div>
                    )}
                </div>

                {/* 2. Top Navigation Links - Desktop Centered */}
                <nav className="hidden lg:flex flex-1 justify-center items-center gap-1 mx-4">
                    {navItems.map((item) => {
                        const isActive = location === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={cn(
                                        "px-5 py-2 text-sm font-medium transition-colors cursor-pointer rounded-md",
                                        isActive
                                            ? "bg-[#2d2d2d] text-white"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {item.label}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* 3. Right Controls & Time */}
                <div className="flex items-center gap-3 md:gap-6">
                    {/* Time - Desktop Only */}
                    <div className="text-xs text-muted-foreground hidden md:block">
                        {time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        <span className="mx-2">|</span>
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Action Icons Group - Desktop */}
                    <div className="hidden md:flex items-center gap-2 bg-[#2d2d2d] p-1 rounded-lg relative">
                        {/* Edit Layout Button */}
                        <button
                            onClick={() => setEditorOpen(true)}
                            className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5 transition-all flex items-center gap-2 px-3"
                            title="Edit Dashboard Layout"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="text-xs font-bold">Edit Layout</span>
                        </button>

                        <div className="w-px h-4 bg-white/10 mx-1" /> {/* Divider */}

                        <button
                            onClick={handleRefresh}
                            className={cn("p-2 text-gray-400 hover:text-white rounded hover:bg-white/5 transition-all", isRefreshing && "text-primary")}
                            title="Refresh Dashboard"
                        >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                        </button>

                        {/* Notifications Wrapper */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={cn("p-2 text-gray-400 hover:text-white rounded hover:bg-white/5", showNotifications && "text-primary bg-white/10")}
                                title="Notifications"
                            >
                                <Bell className="w-4 h-4" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border border-[#2d2d2d]" />
                            </button>

                            {/* Notification Popover */}
                            {showNotifications && (
                                <div className="absolute top-full right-0 mt-3 w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                        <h4 className="font-bold text-white">Recent Alerts</h4>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">3 New</span>
                                    </div>
                                    <div className="space-y-3">
                                        {notifications.map(n => (
                                            <div key={n.id} className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                                    n.type === 'alert' ? "bg-rose-500/20 text-rose-500" :
                                                        n.type === 'success' ? "bg-emerald-500/20 text-emerald-500" : "bg-blue-500/20 text-blue-500"
                                                )}>
                                                    {n.type === 'alert' ? <AlertTriangle className="w-5 h-5" /> :
                                                        n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{n.title}</span>
                                                    <span className="text-[11px] text-gray-500">{n.device} • {n.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full mt-4 py-2 text-xs font-bold text-gray-500 hover:text-white border-t border-white/5 transition-colors">
                                        View All Activity
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsLocked(true)}
                            className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5"
                            title="Lock Screen"
                        >
                            <Lock className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => logoutMutation.mutate()}
                            className="p-2 text-gray-400 hover:text-destructive rounded hover:bg-white/5"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Navigation Drawer */}
                {mobileMenuOpen && (
                    <div className="lg:hidden absolute top-16 left-0 right-0 bg-[#1a1a1a] border-b border-white/10 shadow-xl z-50">
                        {/* Division Badge - Mobile */}
                        {user?.division && (
                            <div className="px-4 py-3 border-b border-white/10">
                                <span className="text-base font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)] uppercase">
                                    {user.division}
                                </span>
                            </div>
                        )}

                        {/* Mobile Navigation Links */}
                        <nav className="py-2">
                            {navItems.map((item) => {
                                const isActive = location === item.href;
                                return (
                                    <Link key={item.href} href={item.href}>
                                        <div
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "px-6 py-3 text-base font-medium transition-colors cursor-pointer",
                                                isActive
                                                    ? "bg-[#2d2d2d] text-white border-l-4 border-primary"
                                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {item.label}
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Mobile Actions */}
                        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-gray-400 hover:text-white rounded" title="Notifications">
                                    <Bell className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        logoutMutation.mutate();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="p-2 text-gray-400 hover:text-destructive rounded"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>
        </>
    );
}
