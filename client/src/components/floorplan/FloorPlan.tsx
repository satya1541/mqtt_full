import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Save, Map as MapIcon, Move } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Device } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function FloorPlan() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1632&q=80"); // Placeholder office plan
    const [isEditing, setIsEditing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingId, setDraggingId] = useState<number | null>(null);

    const { data: devices = [] } = useQuery<Device[]>({
        queryKey: ["/api/devices"],
    });

    const updatePositionMutation = useMutation({
        mutationFn: async ({ id, x, y }: { id: number, x: number, y: number }) => {
            await apiRequest("PATCH", `/api/devices/${id}/position`, { x, y });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
        }
    });

    const handleMouseDown = (e: React.MouseEvent, id: number) => {
        if (!isEditing) return;
        setDraggingId(id);
        e.preventDefault();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingId || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Clamp values
        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));

        // Optimistically update cache or local state would be smoother, 
        // but for now we'll just update on mouse up to avoid flood
        // Actually, to make it smooth we need local state.
        // Let's rely on CSS transform for drag visual and only commit on drop.
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!draggingId || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        updatePositionMutation.mutate({
            id: draggingId,
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y))
        });

        setDraggingId(null);
    };

    return (
        <Card className="glass-panel h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="flex items-center gap-2"><MapIcon className="w-5 h-5" /> Indoor Floor Plan</CardTitle>
                    <CardDescription>Visualize device locations in your facility.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? <><Save className="w-4 h-4 mr-2" /> Done</> : <><Move className="w-4 h-4 mr-2" /> Edit Layout</>}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 relative min-h-[500px] p-0 overflow-hidden bg-neutral-900/50 rounded-b-xl"
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setDraggingId(null)}
            >
                {/* Background Image */}
                <img
                    src={imageUrl}
                    alt="Floor Plan"
                    className="w-full h-full object-cover opacity-50 pointer-events-none select-none"
                    style={{ filter: 'grayscale(100%) contrast(120%) invoice(0)' }}
                />

                {/* Device Markers */}
                <TooltipProvider>
                    {devices.map(device => (
                        <div
                            key={device.id}
                            onMouseDown={(e) => handleMouseDown(e, device.id)}
                            className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center shadow-lg transition-transform ${isEditing ? 'cursor-move hover:scale-110' : 'cursor-pointer'} ${device.status === 'online' ? 'bg-emerald-500/80 text-white shadow-emerald-500/50' : 'bg-neutral-600/80 text-gray-400'
                                }`}
                            style={{
                                left: `${device.xPosition || 50}%`,
                                top: `${device.yPosition || 50}%`,
                                transform: draggingId === device.id ? 'scale(1.2)' : 'scale(1)'
                            }}
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p className="font-bold">{device.name}</p>
                                    <p className="text-xs text-muted-foreground">{device.status}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    ))}
                </TooltipProvider>

                {isEditing && (
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white px-3 py-1 rounded-full text-xs">
                        Drag mode active
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
