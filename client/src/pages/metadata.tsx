import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Metadata {
    id: number;
    userId: string;
    originalKey: string;
    label: string;
    unit: string | null;
    description: string | null;
    category: string;
    createdAt: Date;
    updatedAt: Date;
}

export default function MetadataPage() {
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isEditOpen, setEditOpen] = useState(false);
    const [deleteKey, setDeleteKey] = useState<string | null>(null);
    const [editingMetadata, setEditingMetadata] = useState<Metadata | null>(null);

    const queryClient = useQueryClient();

    const { data: metadataList = [], isLoading } = useQuery<Metadata[]>({
        queryKey: ["/api/metadata"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/metadata", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/metadata"] });
            setCreateOpen(false);
            toast.success("Metadata created successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to create metadata");
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ key, data }: { key: string; data: any }) => {
            const res = await apiRequest("PATCH", `/api/metadata/${encodeURIComponent(key)}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/metadata"] });
            setEditOpen(false);
            setEditingMetadata(null);
            toast.success("Metadata updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update metadata");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (key: string) => {
            await apiRequest("DELETE", `/api/metadata/${encodeURIComponent(key)}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/metadata"] });
            setDeleteKey(null);
            toast.success("Metadata deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete metadata");
        },
    });

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createMutation.mutate({
            originalKey: formData.get("originalKey"),
            label: formData.get("label"),
            unit: formData.get("unit") || "",
            description: formData.get("description") || "",
            category: formData.get("category") || "other",
        });
    };

    const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingMetadata) return;
        const formData = new FormData(e.currentTarget);
        updateMutation.mutate({
            key: editingMetadata.originalKey,
            data: {
                label: formData.get("label"),
                unit: formData.get("unit") || "",
                description: formData.get("description") || "",
                category: formData.get("category") || "other",
            },
        });
    };

    const categoryColors: Record<string, string> = {
        sensor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        status: "bg-green-500/20 text-green-300 border-green-500/30",
        technical: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        other: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Sensor Metadata</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage labels, units, and descriptions for your sensor data types
                        </p>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Metadata
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Metadata</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <Label htmlFor="originalKey">Sensor Key *</Label>
                                    <Input
                                        id="originalKey"
                                        name="originalKey"
                                        placeholder="e.g., temperature, pressure"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        The exact key from your MQTT messages
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="label">Display Label *</Label>
                                    <Input
                                        id="label"
                                        name="label"
                                        placeholder="e.g., Temperature Sensor"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="unit">Unit</Label>
                                    <Input
                                        id="unit"
                                        name="unit"
                                        placeholder="e.g., °C, PSI, %"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        placeholder="Brief description..."
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="category">Category</Label>
                                    <Select name="category" defaultValue="other">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sensor">Sensor</SelectItem>
                                            <SelectItem value="status">Status</SelectItem>
                                            <SelectItem value="technical">Technical</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={createMutation.isPending}>
                                        {createMutation.isPending ? "Creating..." : "Create"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Key</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Label</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Unit</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Category</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Description</th>
                                    <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metadataList.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                            No metadata configured yet. Create one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    metadataList.map((meta: Metadata) => (
                                        <tr key={meta.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <code className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">
                                                    {meta.originalKey}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 text-foreground">{meta.label}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{meta.unit || "—"}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs border ${categoryColors[meta.category] || categoryColors.other}`}>
                                                    {meta.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                                                {meta.description || "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditingMetadata(meta);
                                                            setEditOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDeleteKey(meta.originalKey)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Metadata</DialogTitle>
                    </DialogHeader>
                    {editingMetadata && (
                        <form onSubmit={handleEdit} className="space-y-4">
                            <div>
                                <Label>Sensor Key</Label>
                                <Input value={editingMetadata.originalKey} disabled className="opacity-50" />
                                <p className="text-xs text-muted-foreground mt-1">Key cannot be changed</p>
                            </div>
                            <div>
                                <Label htmlFor="edit-label">Display Label *</Label>
                                <Input
                                    id="edit-label"
                                    name="label"
                                    defaultValue={editingMetadata.label}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-unit">Unit</Label>
                                <Input
                                    id="edit-unit"
                                    name="unit"
                                    defaultValue={editingMetadata.unit || ""}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    name="description"
                                    defaultValue={editingMetadata.description || ""}
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-category">Category</Label>
                                <Select name="category" defaultValue={editingMetadata.category}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sensor">Sensor</SelectItem>
                                        <SelectItem value="status">Status</SelectItem>
                                        <SelectItem value="technical">Technical</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => {
                                    setEditOpen(false);
                                    setEditingMetadata(null);
                                }}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteKey} onOpenChange={(open) => !open && setDeleteKey(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Metadata</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the metadata for <code className="text-foreground">{deleteKey}</code>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteKey && deleteMutation.mutate(deleteKey)}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}
