import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MessageSquare, Plus, Wifi, Terminal, Settings, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Device } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function DevicesPage() {
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"]
  });

  const queryClient = useQueryClient();

  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "update") {
        queryClient.setQueryData(["/api/devices"], (old: Device[] | undefined) => {
          if (!old) return old;
          return old.map(d =>
            d.id === message.deviceId
              ? { ...d, status: message.data.status, lastSeen: message.data.reading?.timestamp || new Date() }
              : d
          );
        });

        // Add log entry
        if (message.data.raw || message.data.reading) {
          const time = new Date().toLocaleTimeString();
          const logContent = message.data.raw
            ? JSON.stringify(message.data.raw)
            : `{ type: "${message.data.reading.type}", value: ${message.data.reading.value} }`;

          setLogs(prev => [...prev, `[${time}] RECV: ${logContent}`].slice(-50));
        }
      } else if (message.type === "alert") {
        toast.error(`ALERT: ${message.data.message}`, {
          description: message.data.ruleName,
        });
      }
    };

    return () => socket.close();
  }, [queryClient]);

  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addDeviceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/devices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast.success("Device added successfully!");
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error("Failed to add device");
    }
  });

  const updateDeviceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/devices/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast.success("Device updated successfully");
      setIsModalOpen(false);
      setEditingDevice(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update device: ${error.message}`);
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast.success("Device removed successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete device: ${error.message}`);
    },
  });

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setIsModalOpen(true);
  };

  const handleAddDevice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (editingDevice) {
      updateDeviceMutation.mutate({ id: editingDevice.id, ...data });
    } else {
      addDeviceMutation.mutate(data);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">MQTT Console</h1>
          <p className="text-muted-foreground text-sm">Monitor and manage device connections</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingDevice(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center gap-2" onClick={() => {
              setEditingDevice(null);
              setIsModalOpen(true);
            }}>
              <Plus className="w-4 h-4" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10 text-white sm:max-w-[600px] p-8 rounded-[32px] overflow-hidden">
            <DialogHeader className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl font-bold text-white">
                    {editingDevice ? "Edit Device" : "Add Device"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-1">
                    Update the device configuration and connection settings.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleAddDevice} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold text-gray-300">Device Name</Label>
                <Input id="name" name="name" defaultValue={editingDevice?.name} className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-primary focus:border-primary" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uniqueId" className="text-sm font-bold text-gray-300">Device ID</Label>
                <Input id="uniqueId" name="uniqueId" defaultValue={editingDevice?.uniqueId || ""} className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-primary focus:border-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="broker" className="text-sm font-bold text-gray-300">MQTT Broker</Label>
                  <Input id="broker" name="broker" defaultValue={editingDevice?.broker || ""} className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protocol" className="text-sm font-bold text-gray-300">Protocol</Label>
                  <Select
                    defaultValue={editingDevice?.protocol || "WebSocket"}
                    onValueChange={(value) => {
                      const input = document.getElementById('protocol-input') as HTMLInputElement;
                      if (input) input.value = value;
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-primary focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white rounded-xl shadow-2xl backdrop-blur-xl">
                      <SelectItem value="MQTT">MQTT</SelectItem>
                      <SelectItem value="MQTTS">MQTTS</SelectItem>
                      <SelectItem value="WebSocket">WebSocket</SelectItem>
                      <SelectItem value="WebSocket Secure">WebSocket Secure</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" id="protocol-input" name="protocol" defaultValue={editingDevice?.protocol || "WebSocket"} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-bold text-gray-300">MQTT Topic</Label>
                <Input id="topic" name="topic" defaultValue={editingDevice?.topic || ""} className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-primary focus:border-primary" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-bold text-gray-300">Username (Optional)</Label>
                  <Input id="username" name="username" defaultValue={editingDevice?.username || ""} className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-bold text-gray-300">Password (Optional)</Label>
                  <Input id="password" name="password" type="password" defaultValue={editingDevice?.password || ""} className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-primary focus:border-primary" />
                </div>
              </div>

              <DialogFooter className="pt-6 gap-3 sm:justify-end">
                <Button type="button" variant="outline" className="border-white/10 text-white hover:bg-white/5 h-12 px-8 rounded-xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">
                  {editingDevice ? "Update Device" : "Add Device"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              Active Connections
            </h3>
            <div className="space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all group gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${device.status?.toLowerCase() === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'} animate-pulse`} />
                    <div className="cursor-pointer min-w-0" onClick={() => {
                      setEditingDevice(device);
                      setIsModalOpen(true);
                    }}>
                      <h4 className="font-semibold text-white group-hover:text-primary transition-colors truncate">{device.name}</h4>
                      <p className="text-[10px] md:text-xs text-muted-foreground font-mono truncate">{device.uniqueId || device.description || "No ID"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className={`text-xs font-bold uppercase tracking-wider ${device.status?.toLowerCase() === 'connected' ? 'text-emerald-400' : 'text-rose-400'}`}>{device.status}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Last: {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Never"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10"
                        onClick={() => handleEditDevice(device)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900/90 border-white/10 backdrop-blur-xl rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Remove Device?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              This will permanently delete the device <b>{device.name}</b> and all its historical telemetry data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteDeviceMutation.mutate(device.id)}
                              className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
                            >
                              Delete Device
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 h-[300px] flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-violet-400" />
              Live Console Output
            </h3>
            <div className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-xs text-emerald-400/80 overflow-y-auto space-y-1">
              {logs.length > 0 ? (
                <>
                  {logs.map((log, i) => <p key={i}>{log}</p>)}
                  <div ref={logEndRef} />
                </>
              ) : (
                <>
                  <p>[{new Date().toLocaleTimeString()}] Listening for MQTT traffic...</p>
                  <div className="animate-pulse inline-block w-2 h-4 bg-emerald-400/50 align-middle ml-1" />
                  <div ref={logEndRef} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
