import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, RotateCcw } from 'lucide-react';
import type { WidgetPreference } from '@/hooks/useWidgetPreferences';
import type { InferredMetadata } from '@/types/shared';

interface WidgetEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableSensors: InferredMetadata[];
    preferences: WidgetPreference[];
    onSave: (preferences: Omit<WidgetPreference, 'id'>[]) => Promise<void>;
    onReset: () => Promise<void>;
}

interface SortableItemProps {
    id: string;
    sensorType: string;
    label: string;
    visible: boolean;
    onToggleVisibility: (sensorType: string) => void;
}

function SortableItem({ id, sensorType, label, visible, onToggleVisibility }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>
            <Checkbox
                checked={visible}
                onCheckedChange={() => onToggleVisibility(sensorType)}
                id={`widget-${sensorType}`}
            />
            <label
                htmlFor={`widget-${sensorType}`}
                className="flex-1 text-sm font-medium cursor-pointer"
            >
                {label}
            </label>
        </div>
    );
}

export function WidgetEditor({
    open,
    onOpenChange,
    availableSensors,
    preferences,
    onSave,
    onReset,
}: WidgetEditorProps) {
    const [localPrefs, setLocalPrefs] = useState<Record<string, { visible: boolean; order: number }>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Initialize local state from preferences or defaults
    useEffect(() => {
        if (availableSensors.length === 0) return;

        const prefsMap: Record<string, { visible: boolean; order: number }> = {};

        // Start with all sensors from preferences
        preferences.forEach((pref, idx) => {
            prefsMap[pref.sensorType] = {
                visible: pref.visible,
                order: idx
            };
        });

        // Add any new sensors that aren't in preferences yet
        availableSensors.forEach((sensor, idx) => {
            if (!prefsMap[sensor.originalKey]) {
                prefsMap[sensor.originalKey] = {
                    visible: true,
                    order: preferences.length + idx
                };
            }
        });

        setLocalPrefs(prefsMap);
    }, [availableSensors, preferences]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Get sorted items for display
    const sortedItems = Object.entries(localPrefs)
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([sensorType]) => sensorType);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = sortedItems.indexOf(active.id as string);
            const newIndex = sortedItems.indexOf(over.id as string);
            const newOrder = arrayMove(sortedItems, oldIndex, newIndex);

            setLocalPrefs(prev => {
                const updated = { ...prev };
                newOrder.forEach((sensorType, idx) => {
                    updated[sensorType] = { ...updated[sensorType], order: idx };
                });
                return updated;
            });
        }
    };

    const handleToggleVisibility = (sensorType: string) => {
        setLocalPrefs(prev => ({
            ...prev,
            [sensorType]: {
                ...prev[sensorType],
                visible: !prev[sensorType].visible
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const prefsArray = Object.entries(localPrefs).map(([sensorType, data]) => ({
                sensorType,
                visible: data.visible,
                order: data.order
            }));
            await onSave(prefsArray);
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        await onReset();
        onOpenChange(false);
    };

    const getSensorLabel = (sensorType: string) => {
        return availableSensors.find(s => s.originalKey === sensorType)?.label || sensorType;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Dashboard Layout</DialogTitle>
                    <DialogDescription>
                        Drag to reorder, use checkboxes to show/hide sensors
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-2">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedItems}
                            strategy={verticalListSortingStrategy}
                        >
                            {sortedItems.map((sensorType) => (
                                <SortableItem
                                    key={sensorType}
                                    id={sensorType}
                                    sensorType={sensorType}
                                    label={getSensorLabel(sensorType)}
                                    visible={localPrefs[sensorType]?.visible ?? true}
                                    onToggleVisibility={handleToggleVisibility}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </Button>
                    <div className="flex-1" />
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
