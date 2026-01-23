
import { db } from "../server/db";
import { devices } from "../shared/schema";
import { eq, or } from "drizzle-orm";

async function main() {
    console.log("Searching for test device...");

    // Try to find by ID 4 or name "Test" or "AI Test Device"
    const foundDevices = await db.select().from(devices).where(
        or(
            eq(devices.id, 4),
            eq(devices.name, "Test"),
            eq(devices.name, "AI Test Device")
        )
    );

    if (foundDevices.length === 0) {
        console.error("No matching device found!");
        process.exit(1);
    }

    const device = foundDevices[0];
    console.log(`Found device: ${device.name} (ID: ${device.id})`);
    console.log(`Current Config -> Broker: ${device.broker}, Topic: ${device.topic}`);

    console.log("Updating configuration...");

    await db.update(devices)
        .set({
            broker: "mqtt://test.mosquitto.org",
            topic: "iot-dashboard/test-ai",
            protocol: "mqtt"
        })
        .where(eq(devices.id, device.id));

    console.log("Update complete!");
    process.exit(0);
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
