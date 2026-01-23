export interface InferredMetadata {
    originalKey: string;
    label: string;
    unit: string;
    description: string;
    category: "sensor" | "status" | "technical" | "other";
}
