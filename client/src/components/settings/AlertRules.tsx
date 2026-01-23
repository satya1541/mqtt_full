import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import type { AlertRule } from "@shared/schema";

export function AlertRules() {
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);

    // New Rule State
    const [name, setName] = useState("");
    const [sensorType, setSensorType] = useState("temperature");
    const [operator, setOperator] = useState(">");
    const [value, setValue] = useState("");
    const [severity, setSeverity] = useState("warning");

    const { data: rules = [] } = useQuery<AlertRule[]>({
        queryKey: ["/api/alerts/rules"],
    });

    const createRuleMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/alerts/rules", {
                name,
                sensorType,
                conditionOperator: operator,
                conditionValue: parseFloat(value),
                severity,
                enabled: true
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
            toast.success("Alert rule created");
            setIsCreating(false);
            setName("");
            setValue("");
        },
        onError: () => {
            toast.error("Failed to create rule");
        }
    });

    const deleteRuleMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/alerts/rules/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
            toast.success("Rule deleted");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !value) return;
        createRuleMutation.mutate();
    };

    return (
        <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Alert Rules</CardTitle>
                    <CardDescription>Define automatic alerts based on sensor thresholds.</CardDescription>
                </div>
                <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "secondary" : "default"}>
                    {isCreating ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> New Rule</>}
                </Button>
            </CardHeader>
            <CardContent>
                {isCreating && (
                    <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl bg-muted/50 border border-border space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rule Name</label>
                                <Input placeholder="e.g. High Temp Warning" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sensor Type</label>
                                <Select value={sensorType} onValueChange={setSensorType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="temperature">Temperature</SelectItem>
                                        <SelectItem value="humidity">Humidity</SelectItem>
                                        <SelectItem value="pressure">Pressure</SelectItem>
                                        <SelectItem value="voltage">Voltage</SelectItem>
                                        <SelectItem value="current">Current</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Condition</label>
                                <div className="flex gap-2">
                                    <Select value={operator} onValueChange={setOperator}>
                                        <SelectTrigger className="w-[80px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=">">&gt;</SelectItem>
                                            <SelectItem value="<">&lt;</SelectItem>
                                            <SelectItem value="=">=</SelectItem>
                                            <SelectItem value=">=">&ge;</SelectItem>
                                            <SelectItem value="<=">&le;</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" step="0.1" placeholder="Value" value={value} onChange={e => setValue(e.target.value)} required className="flex-1" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Severity</label>
                                <Select value={severity} onValueChange={setSeverity}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Info</SelectItem>
                                        <SelectItem value="warning">Warning</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button type="submit" className="w-full" disabled={createRuleMutation.isPending}>
                                    {createRuleMutation.isPending ? "Saving..." : "Save Rule"}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}

                <div className="rounded-md border border-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Condition</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No alert rules defined.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rules.map((rule) => (
                                    <TableRow key={rule.id}>
                                        <TableCell className="font-medium">{rule.name}</TableCell>
                                        <TableCell>
                                            <span className="capitalize">{rule.sensorType}</span> {rule.conditionOperator} {rule.conditionValue}
                                        </TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${rule.severity === 'critical' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                                    rule.severity === 'warning' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                }`}>
                                                {rule.severity === 'critical' && <AlertCircle className="w-3 h-3 mr-1" />}
                                                {rule.severity === 'warning' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                {rule.severity === 'info' && <Info className="w-3 h-3 mr-1" />}
                                                {rule.severity.toUpperCase()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteRuleMutation.mutate(rule.id)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
