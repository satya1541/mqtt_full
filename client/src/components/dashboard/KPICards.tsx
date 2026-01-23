import { ArrowUpRight, Thermometer, Droplets, Activity, Cpu, Gauge, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomMetric {
  label: string;
  value: string;
  trend: string;
}

interface Props {
  totalDevices: number;
  onlineCount: number;
  totalReadings: number;
  customMetrics: CustomMetric[];
}

export function KPICards({ totalDevices, onlineCount, totalReadings, customMetrics }: Props) {
  // 1. Static System Cards
  const systemCards = [
    {
      title: "Active Devices",
      value: onlineCount.toString(),
      change: `${totalDevices > 0 ? Math.round((onlineCount / totalDevices) * 100) : 0}% Online`,
      icon: Cpu,
      color: "text-rose-400",
      bg: "bg-rose-400/10",
      chart: "path-3",
    },
    {
      title: "Total Messages",
      value: totalReadings.toLocaleString(),
      change: "Live Stream",
      icon: Activity,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
      chart: "path-4",
    },
  ];

  // 2. Dynamic Metric Cards (mapped from customMetrics)
  const metricCards = customMetrics.map((m, i) => ({
    title: m.label,
    value: m.value,
    change: m.trend,
    icon: m.label.toLowerCase().includes('temp') ? Thermometer :
      m.label.toLowerCase().includes('hum') ? Droplets :
        m.label.toLowerCase().includes('index') ? Hash : Gauge,
    color: i % 2 === 0 ? "text-emerald-400" : "text-blue-400",
    bg: i % 2 === 0 ? "bg-emerald-400/10" : "bg-blue-400/10",
    chart: `path-${i}`,
  }));

  // Combine: [Metric 1, Metric 2, ... , System 1, System 2]
  // We want the metrics first usually, or mixed? 
  // User had "Avg Temp", "Avg Hum", "Active Device", "Total Msgs".
  // Let's put metrics first, then system cards.
  const cards = [...metricCards, ...systemCards];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">{card.title}</p>
              <h3 className="text-2xl font-bold text-foreground">{card.value}</h3>
            </div>
            <div className={cn("p-2 rounded-xl", card.bg)}>
              <card.icon className={cn("w-5 h-5", card.color)} />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
              (card.change.includes('+') || card.change.includes('Optimal') || card.change.includes('Normal') || card.change.includes('Online'))
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-violet-500/20 text-violet-400"
            )}>
              {card.change}
            </span>
            <span className="text-[10px] text-muted-foreground italic">system status</span>
          </div>

          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
        </div>
      ))}
    </div>
  );
}
