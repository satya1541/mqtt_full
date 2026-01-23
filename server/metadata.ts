import { storage } from "./storage";
import { type Metadata } from "@shared/schema";
import { log } from "./index";

// In-Memory Cache for fast lookups in MQTT stream
let metadataCache: Map<string, Metadata> = new Map();
let lastSync = 0;
const CACHE_TTL = 10000; // 10 seconds

async function syncCache() {
    const now = Date.now();
    if (now - lastSync < CACHE_TTL && metadataCache.size > 0) return;

    try {
        // Use system/admin to get all possible metadata for cache
        const all = await storage.getMetadata("system", "admin");
        metadataCache = new Map(all.map(m => [m.originalKey, m]));
        lastSync = now;
        log(`Synced ${metadataCache.size} metadata entries to cache`, "Metadata");
    } catch (err) {
        console.error("[Metadata] Sync failed:", err);
    }
}

// Initial Sync
syncCache();

export const metadataService = {
    get: async (key: string) => {
        await syncCache();
        return metadataCache.get(key);
    },

    set: async (key: string, data: any) => {
        // We handle 'system' as the default for auto-discovered types
        try {
            const existing = await storage.getMetadataByKey(key, "system", "admin");
            if (existing) {
                await storage.updateMetadata(key, "system", data);
            } else {
                await storage.createMetadata({ ...data, userId: "system", originalKey: key });
            }
            lastSync = 0; // Force sync
            await syncCache();
        } catch (err) {
            console.error("[Metadata] Set failed:", err);
        }
    },

    getAll: async () => {
        await syncCache();
        return Array.from(metadataCache.values());
    },

    has: (key: string) => {
        // For 'has', we check cache but don't force sync every time for performance
        return metadataCache.has(key);
    },

    sync: syncCache
};