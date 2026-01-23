import { db } from "./server/db";
import { readings } from "./shared/schema";
import { sql } from "drizzle-orm";

async function clear() {
    console.log("Cleaning up simulated readings...");
    await db.delete(readings);
    console.log("Success: Database readings cleared.");
    process.exit(0);
}

clear().catch(err => {
    console.error(err);
    process.exit(1);
});
