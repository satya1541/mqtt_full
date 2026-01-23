import { db } from "./server/db";
import { readings } from "./shared/schema";
import { desc } from "drizzle-orm";

async function check() {
    const latest = await db.select().from(readings).orderBy(desc(readings.timestamp)).limit(5);
    console.log(JSON.stringify(latest, null, 2));
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
