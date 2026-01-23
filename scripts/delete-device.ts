
import { storage } from "../server/storage";

async function run() {
    try {
        console.log("Removing device 4...");
        await storage.deleteDevice(4);
        console.log("Device 4 removed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error removing device:", error);
        process.exit(1);
    }
}

run();
