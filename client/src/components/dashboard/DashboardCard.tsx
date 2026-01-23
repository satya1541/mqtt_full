import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { LineChart, BarChart3, PieChart, Activity } from "lucide-react";
import { ChartVariant } from "../charts/SmartChart";

interface DashboardCardProps {
    title: string;
    children: ReactNode;
    className?: string; // For grid spans
    activeVariant?: ChartVariant;
    onVariantChange?: (variant: ChartVariant) => void;
    hideControls?: boolean;
}

export function DashboardCard({
    title,
    children,
    className,
    activeVariant = 'auto',
    onVariantChange,
    hideControls = false
}: DashboardCardProps) {
    const variants: { id: ChartVariant; icon: any; label: string }[] = [
        { id: 'auto', icon: Activity, label: 'Smart' },
        { id: 'line', icon: LineChart, label: 'Line' },
        { id: 'bar', icon: BarChart3, label: 'Bar' },
        { id: 'pie', icon: PieChart, label: 'Pie' },
    ];

    return (
        <div className={cn("glass-panel flex flex-col overflow-hidden animate-in zoom-in duration-300", className)}>
            {/* Card Header */}
            <div className="h-10 px-4 border-b border-border flex items-center justify-between bg-card/50">
                <h3 className="text-sm font-bold text-foreground/80 tracking-wide uppercase">{title}</h3>

                {/* Chart Type Actions */}
                {!hideControls && (
                    <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity duration-300">
                        {variants.map((v) => (
                            <button
                                key={v.id}
                                onClick={() => onVariantChange?.(v.id)}
                                className={cn(
                                    "p-1.5 rounded-md transition-all hover:bg-accent",
                                    activeVariant === v.id ? "text-primary bg-primary/10 opacity-100" : "text-muted-foreground"
                                )}
                                title={`${v.label} View`}
                            >
                                <v.icon className="w-3.5 h-3.5" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="p-4 flex-1 relative min-h-[150px]">
                {children}
            </div>
        </div>
    );
}
