
import mqtt from "mqtt";

const BROKER = "mqtt://test.mosquitto.org";
const TOPIC = "iot-dashboard/test-ai";

console.log(`Connecting to ${BROKER}...`);
const client = mqtt.connect(BROKER);

client.on("connect", () => {
    console.log("Connected to public broker. Sending BIG payload...");

    // Complex Payload with GPS, Nested Data, and Arrays
    const bigPayload = {
        "gps": {
            "latitude": 40.7128 + (Math.random() * 0.01),
            "longitude": -74.0060 + (Math.random() * 0.01),
            "altitude_m": 150
        },
        "environment": {
            "ambient_temp_c": 24.5,
            "humidity_percent": 60,
            "pressure_hpa": 1013
        },
        "engine_telemetry": {
            "rpm": 3200 + Math.random() * 100,
            "fuel_flow_lph": 12.5,
            "oil_pressure_psi": 45
        },
        "system_status": {
            "cpu_load_percent": 12,
            "memory_usage_mb": 450,
            "uptime_hours": 124.5,
            "active_errors": 0
        },
        "vibration_analysis": [0.1, 0.4, 0.2, 0.8, 0.3] // Should be ignored or handled as array
    };

    // Note: Our backend flattens or recurses. 
    // The current logic in mqtt.ts handles flat keys or array of objects.
    // It mostly calls:
    // Case B: Hardware schema (Key-Value) -> iterate object.entries.
    // So for "gps": { ... }, it might need recursive handling or flattening on the SERVER side to be perfect.
    // Let's see what happens. If the server does `Object.entries(item)`, "gps" will be an object.
    // The server checks `if (!isNaN(numericVal))`. Objects will fail this check.
    // So nested objects might be skipped unless we flattened them first.

    // To be safe for THIS specific backend implementation (which seemed flat-ish in analysis),
    // let's send a FLATTENED version for the "Big JSON" request to ensure it works, 
    // OR we relies on the server to be smart. 
    // Looking at mqtt.ts:
    // for (const [key, val] of Object.entries(item)) {
    //    if (!isNaN(parseFloat(val))) ...
    // }
    // So "gps": {...} will have val as [Object object], parseFloat -> NaN. SKIPPED.

    // SOLUTION: Send a flat payload for now, as that's what the current ingestion logic supports.

    const flatPayload = {
        // Map
        "latitude": 40.7128 + (Math.random() * 0.01),
        "longitude": -74.0060 + (Math.random() * 0.01),

        // Categorical -> PIE / DONUT
        "drive_mode": ["Eco", "Sport", "Comfort", "Offroad"][Math.floor(Math.random() * 4)],
        "system_status": ["OK", "Warning", "Critical"][Math.floor(Math.random() * 3)],

        // "RPM/Speed" -> GAUGE + SPLINE
        "engine_rpm": 3000 + (Math.random() * 500),

        // "Temp/Hum" -> CANDLESTICK + GAUGE
        "exhaust_temp_c": 450 + (Math.random() * 10),

        // "Traffic/Flow/Amp" -> AREA + HEATMAP
        "network_traffic_kbps": 120 + (Math.random() * 50),
        "current_draw_amps": 4.2 + (Math.random() * 0.5),

        // "Press/Volt" -> BAR + LOLLIPOP
        "cylinder_pressure_psi": [140, 142, 138, 145, 139, 141][Math.floor(Math.random() * 6)],
        "battery_voltage": 13.5 + (Math.random() * 0.5)
    };

    console.log(`Publishing to ${TOPIC}:`, flatPayload);
    client.publish(TOPIC, JSON.stringify(flatPayload), () => {
        console.log("Message sent. Closing.");
        client.end();
    });
});
