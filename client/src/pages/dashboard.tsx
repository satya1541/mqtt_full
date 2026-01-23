import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { WorldMap } from "@/components/dashboard/WorldMap";
import { SmartChart, ChartVariant } from "@/components/charts/SmartChart";
import { useWidgetPreferences } from "@/hooks/useWidgetPreferences";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Device } from "@shared/schema";
import { useEffect, useState } from "react";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { toast } from "sonner";
import { formatDecimalTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InferredMetadata } from "@/types/shared";

// Interface matching server/services/ai.ts

export default function Dashboard() {
  const { preferences } = useWidgetPreferences();

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"]
  });

  const { data: readings = [] } = useQuery<any[]>({
    queryKey: ["/api/readings/history"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/readings/history");
      const data = await res.json();
      return data.reverse();
    }
  });

  // Now returns metadata objects instead of strings
  const { data: activeTypes = [] } = useQuery<InferredMetadata[]>({
    queryKey: ["/api/readings/types"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Apply widget preferences to filter and sort sensors
  const visibleTypes = activeTypes
    .filter(meta => {
      // Exclude lat/lon as they are displayed on the Field Map
      const isGps = ['lat', 'lon', 'latitude', 'longitude'].includes(meta.originalKey.toLowerCase());
      if (isGps) return false;

      const pref = preferences.find(p => p.sensorType === meta.originalKey);
      return pref ? pref.visible : true; // Default to visible if no preference
    })
    .sort((a, b) => {
      const prefA = preferences.find(p => p.sensorType === a.originalKey);
      const prefB = preferences.find(p => p.sensorType === b.originalKey);
      const orderA = prefA?.order ?? 999;
      const orderB = prefB?.order ?? 999;
      return orderA - orderB;
    });

  const queryClient = useQueryClient();

  // WebSocket logic...
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "update") {
        if (message.data && message.data.reading) {
          const newReading = message.data.reading;
          queryClient.setQueryData<any[]>(["/api/readings/history"], (old) => {
            const current = old || [];
            return [...current, newReading].slice(-50);
          });
          // For metadata, we might need a refresh if it's a new type
          // We can just invalidate strictly
          queryClient.invalidateQueries({ queryKey: ["/api/readings/types"] });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      } else if (message.type === "alert") {
        toast.error(message.data.message, {
          description: `Device: ${devices.find(d => d.id === message.deviceId)?.name || message.deviceId}`,
          duration: 5000,
        });
      }
    };
    return () => socket.close();
  }, [queryClient]);

  // Status logic removed

  const hasGps = readings.some((r: any) =>
    ['lat', 'lon', 'latitude', 'longitude'].some(k => r.type.toLowerCase().includes(k))
  );

  const handleExport = (filename: string, data: any[]) => {
    if (!data.length) return toast.error("No data");
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `${filename}_${new Date().toISOString()}.csv`;
    link.click();
    toast.success(`Exported ${filename}`);
  };

  const [chartVariants, setChartVariants] = useState<Record<string, ChartVariant>>({});
  const [isMapModalOpen, setMapModalOpen] = useState(false);

  if (devices.length === 0 && readings.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
          <div className="p-6 rounded-full bg-primary/10 mb-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white">Waiting for Stream Data...</h2>
          <p className="text-muted-foreground max-w-md text-center">
            No active devices or telemetry detected. Please connect a device via MQTT or wait for the next heartbeat.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Field Map Location - Moved to Top */}
        {hasGps && (
          <div className="col-span-1 h-[200px] cursor-pointer" onClick={() => setMapModalOpen(true)}>
            <DashboardCard title="Field Map Location" className="h-full" hideControls={true}>
              <WorldMap readings={readings} />
            </DashboardCard>
          </div>
        )}

        {/* Dynamic Cards By Sensor Type */}
        {visibleTypes.map((meta, i) => {
          const typeKey = meta.originalKey;

          // Helper to get device name
          const getDeviceName = (id: number) => devices.find(d => d.id === id)?.name || `Device ${id}`;

          const TypeData = readings
            .filter((r: any) => r.type === typeKey)
            .map(r => ({ ...r, deviceName: getDeviceName(r.deviceId) })); // Enrich with Name

          if (!TypeData.length) return null;

          const cardTitle = `${meta.label} ${meta.unit ? `(${meta.unit}) ` : ''}`;

          // Color generation
          const color = (typeKey.includes('temp') || typeKey.includes('err') || typeKey.includes('cr')) ? '#ef4444' :
            (typeKey.includes('hum') || typeKey.includes('water') || typeKey.includes('level')) ? '#3b82f6' :
              (typeKey.includes('volt') || typeKey.includes('power')) ? '#eab308' : '#10b981';

          const activeVariant = chartVariants[typeKey] || 'auto';

          const latestReading = TypeData.length > 0 ? TypeData[TypeData.length - 1] : null;
          const latestValue = latestReading?.value ?? 0;
          const latestStringValue = latestReading?.stringValue;
          const isTechnical = meta.category === 'technical';
          const isStringValue = latestStringValue !== null && latestStringValue !== undefined;


          return (
            <div key={`${typeKey}-chart-${i}`} className="col-span-1 h-[200px] animate-in fade-in zoom-in duration-500">
              <DashboardCard
                title={cardTitle}
                className="h-full"
                activeVariant={activeVariant}
                onVariantChange={(v) => setChartVariants(prev => ({ ...prev, [typeKey]: v }))}
                hideControls={isTechnical || isStringValue}
              >
                {isStringValue ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="px-6 py-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <span className="text-3xl font-bold text-primary">{latestStringValue}</span>
                    </div>
                  </div>
                ) : isTechnical ? (
                  <div className="flex items-center justify-center h-full text-4xl font-bold text-foreground">
                    {meta.unit === 'IST' ? formatDecimalTime(latestValue) : latestValue}
                  </div>
                ) : (
                  <div className="w-full h-full p-2">
                    <SmartChart
                      data={TypeData}
                      typeKey={typeKey}
                      label={meta.label}
                      unit={meta.unit}
                      color={color}
                      variant={activeVariant}
                    />
                  </div>
                )}
              </DashboardCard>
            </div>
          )
        })}
      </div>

      {/* Widget Editor Dialog */}

      <Dialog open={isMapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Live Map View</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <WorldMap readings={readings} isLarge={true} />
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
