import { db } from "../server/db.js";
import { metadata } from "../shared/schema.js";
import fs from "fs";
import path from "path";
import { eq, and } from "drizzle-orm";

/**
 * Import existing metadata.json entries into the database
 * Run this script once after creating the metadata table
 * 
 * Usage: tsx scripts/import_metadata.ts [userId]
 * If no userId provided, will use "system" as default
 */

const METADATA_JSON_PATH = path.join(process.cwd(), "server", "metadata.json");

async function importMetadata() {
    const userId = process.argv[2] || "system";

    console.log(`[Import] Starting metadata import for user: ${userId}`);

    // Check if metadata.json exists
    if (!fs.existsSync(METADATA_JSON_PATH)) {
        console.error(`[Import] Error: metadata.json not found at ${METADATA_JSON_PATH}`);
        process.exit(1);
    }

    // Read metadata.json
    const rawData = fs.readFileSync(METADATA_JSON_PATH, "utf-8");
    const metadataObj = JSON.parse(rawData);

    const entries = Object.values(metadataObj) as any[];
    console.log(`[Import] Found ${entries.length} metadata entries to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const entry of entries) {
        try {
            const { originalKey, label, unit, description, category } = entry;

            // Check if already exists
            const existing = await db
                .select()
                .from(metadata)
                .where(
                    and(
                        eq(metadata.originalKey, originalKey),
                        eq(metadata.userId, userId)
                    )
                );

            if (existing.length > 0) {
                console.log(`[Import] Skipping "${originalKey}" - already exists`);
                skipped++;
                continue;
            }

            // Insert new entry
            await db.insert(metadata).values({
                userId,
                originalKey,
                label,
                unit: unit || "",
                description: description || "",
                category: category || "other",
            });

            console.log(`[Import] ✓ Imported "${originalKey}" as "${label}"`);
            imported++;

        } catch (error: any) {
            console.error(`[Import] ✗ Failed to import "${entry.originalKey}":`, error.message);
            errors++;
        }
    }

    console.log(`\n[Import] Summary:`);
    console.log(`  - Imported: ${imported}`);
    console.log(`  - Skipped:  ${skipped}`);
    console.log(`  - Errors:   ${errors}`);
    console.log(`  - Total:    ${entries.length}`);

    if (imported > 0) {
        console.log(`\n✅ Successfully imported metadata for user: ${userId}`);
    }

    process.exit(0);
}

importMetadata().catch((error) => {
    console.error("[Import] Fatal error:", error);
    process.exit(1);
});
