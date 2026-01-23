import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { insertDeviceSchema } from "@shared/schema";
import { MQTTService } from "./mqtt";
import { metadataService } from "./metadata";
import { analyzeIncidents, processNaturalLanguageQuery, generateHealthReport } from "./services/ai";
import type { IncomingMessage } from "http";
import cookie from "cookie";

// Track authenticated WebSocket clients
const authenticatedClients = new Map<WebSocket, { userId: string; role: string }>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // MQTT Service with authenticated clients map
  const mqttService = new MQTTService(wss, authenticatedClients);
  await mqttService.syncDevices();

  wss.on("connection", async (ws, req: IncomingMessage) => {
    // Authenticate WebSocket connection via session cookie
    try {
      const cookies = cookie.parse(req.headers.cookie || "");
      const sessionId = cookies["connect.sid"];

      if (!sessionId) {
        console.warn("[WebSocket] Connection without session cookie");
        ws.close(1008, "Unauthorized"); // Policy Violation
        return;
      }

      // Decode the session ID (express-session signs cookies)
      const actualSessionId = sessionId.startsWith("s:")
        ? sessionId.slice(2).split(".")[0]
        : sessionId;

      // Lookup user from session store
      await new Promise<void>((resolve, reject) => {
        (storage.sessionStore as any).get(actualSessionId, async (err: Error | null, session: any) => {
          if (err || !session || !session.passport || !session.passport.user) {
            console.warn("[WebSocket] Invalid or expired session");
            ws.close(1008, "Unauthorized");
            reject(new Error("Unauthorized"));
            return;
          }

          const userId = session.passport.user;
          const user = await storage.getUser(userId);

          if (!user) {
            console.warn("[WebSocket] User not found:", userId);
            ws.close(1008, "Unauthorized");
            reject(new Error("User not found"));
            return;
          }

          // Store authenticated user info
          authenticatedClients.set(ws, { userId: user.id, role: user.role });
          console.log(`[WebSocket] Authenticated: ${user.username} (${user.role})`);
          resolve();
        });
      });
    } catch (error) {
      console.error("[WebSocket] Authentication error:", error);
      ws.close(1011, "Internal error");
      return;
    }

    ws.on("close", () => {
      authenticatedClients.delete(ws);
      // console.log("Client disconnected");
    });
  });

  // API Routes
  app.get("/api/devices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const devices = await storage.getDevices(user.id, user.role);
    res.json(devices);
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const updatedUser = await storage.updateUser(user.id, req.body);
    // Update the session user
    req.login(updatedUser, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(updatedUser);
    });
  });

  app.post("/api/devices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const result = insertDeviceSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(result.error);
      return;
    }
    const device = await storage.createDevice({ ...result.data, ownerId: user.id });
    await mqttService.syncDevices(); // Sync new MQTT connection
    res.json(device);
  });

  app.patch("/api/devices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const device = await storage.getDevice(id);
    if (!device) return res.sendStatus(404);

    const user = req.user as any;
    if (user.role !== "admin" && device.ownerId !== user.id) {
      return res.sendStatus(403);
    }

    const updated = await storage.updateDevice(id, req.body);
    await mqttService.syncDevices(); // Sync updated MQTT connection
    res.json(updated);
  });

  app.delete("/api/devices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const device = await storage.getDevice(id);
    if (!device) return res.sendStatus(404);

    const user = req.user as any;
    if (user.role !== "admin" && device.ownerId !== user.id) {
      return res.sendStatus(403);
    }

    await storage.deleteDevice(id);
    await mqttService.syncDevices(); // Cleanup MQTT connection
    res.sendStatus(200);
  });

  app.patch("/api/devices/:id/position", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const { x, y } = req.body;

    // TODO: Verify ownership
    await storage.updateDevicePosition(id, x, y);
    res.sendStatus(200);
  });

  app.get("/api/devices/:id/readings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    // TODO: Verify user owns this device or is admin
    const readings = await storage.getReadings(id);
    res.json(readings);
  });

  app.get("/api/readings/types", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Return full metadata objects (enriched by AI)
    const allMeta = await metadataService.getAll();
    res.json(allMeta);
  });

  app.get("/api/readings/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
    const readings = await storage.getRecentReadings(user.id, user.role, limit);
    res.json(readings);
  });

  // Widget Preferences Routes
  app.get("/api/widgets/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const preferences = await storage.getWidgetPreferences(user.id);
    res.json(preferences);
  });

  app.post("/api/widgets/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    await storage.saveWidgetPreferences(user.id, req.body);
    res.sendStatus(200);
  });

  app.delete("/api/widgets/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    await storage.resetWidgetPreferences(user.id);
    res.sendStatus(200);
  });

  // Metadata Routes
  app.get("/api/metadata", async (req, res) => {
    const user = req.user as any;
    const userId = user?.id || "system";
    const userRole = user?.role || "user";
    console.log(`[API] Fetching metadata for ${userId === "system" ? "Guest/System" : (user?.username || userId)}`);
    try {
      const metadata = await storage.getMetadata(userId, userRole);
      res.json(metadata);
    } catch (error: any) {
      console.error("[API] Error fetching metadata:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/metadata/:key", async (req, res) => {
    const user = req.user as any;
    const userId = user?.id || "system";
    const userRole = user?.role || "user";
    const metadata = await storage.getMetadataByKey(req.params.key, userId, userRole);
    if (!metadata) return res.sendStatus(404);
    res.json(metadata);
  });

  app.post("/api/metadata", async (req, res) => {
    const user = req.user as any;
    const userId = user?.id || "system";
    try {
      const metadata = await storage.createMetadata({ ...req.body, userId });
      res.json(metadata);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/metadata/:key", async (req, res) => {
    const user = req.user as any;
    const userId = user?.id || "system";
    try {
      const metadata = await storage.updateMetadata(req.params.key, userId, req.body);
      res.json(metadata);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  app.delete("/api/metadata/:key", async (req, res) => {
    const user = req.user as any;
    const userId = user?.id || "system";
    const userRole = user?.role || "user";
    await storage.deleteMetadata(req.params.key, userId, userRole);
    res.sendStatus(200);
  });




  // Alert Rules Routes
  app.get("/api/alerts/rules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const rules = await storage.getAlertRules(user.id);
    res.json(rules);
  });

  app.post("/api/alerts/rules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const rule = await storage.createAlertRule({ ...req.body, userId: user.id });
    res.json(rule);
  });

  app.delete("/api/alerts/rules/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // TODO: Verify ownership
    await storage.deleteAlertRule(parseInt(req.params.id));
    res.sendStatus(200);
  });

  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    // Fetch real data to generate notifications
    const devices = await storage.getDevices(user.id, user.role);
    const readings = await storage.getRecentReadings(user.id, user.role, 50);
    const rules = await storage.getAlertRules(user.id);

    const notifications: any[] = [];
    let idCounter = 1;

    // 1. Check for Offline Devices
    devices.forEach(d => {
      if (d.status === 'offline') {
        notifications.push({
          id: idCounter++,
          type: 'alert',
          title: 'Device Offline',
          device: d.name,
          time: d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'
        });
      }
    });

    // 2. Check Rules against Readings
    readings.forEach(r => {
      // Find rules matching this sensor type
      const applicableRules = rules.filter(rule =>
        rule.enabled && r.type.toLowerCase().includes(rule.sensorType.toLowerCase())
      );

      applicableRules.forEach(rule => {
        let triggered = false;
        switch (rule.conditionOperator) {
          case '>': triggered = r.value > rule.conditionValue; break;
          case '<': triggered = r.value < rule.conditionValue; break;
          case '=': triggered = r.value === rule.conditionValue; break;
          case '>=': triggered = r.value >= rule.conditionValue; break;
          case '<=': triggered = r.value <= rule.conditionValue; break;
        }

        if (triggered) {
          const deviceName = devices.find(d => d.id === r.deviceId)?.name || `Device #${r.deviceId}`;
          notifications.push({
            id: idCounter++,
            type: rule.severity === 'critical' || rule.severity === 'warning' ? 'alert' : 'info',
            title: rule.name, // Use the user-defined rule name
            device: deviceName,
            time: new Date(r.timestamp!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            meta: `${r.value} ${r.unit}`
          });
        }
      });
    });

    // 3. Keep existing Hardcoded Safety Net (Optional, but good for defaults)
    // Removed to purely rely on user rules + offline check for cleaner logic

    // Deduplicate notifications (same title within same minute)
    const uniqueNotifications = notifications.filter((n, index, self) =>
      index === self.findIndex((t) => (
        t.title === n.title && t.device === n.device
      ))
    );

    res.json(uniqueNotifications.slice(0, 20));
  });

  // Analytics Routes
  app.get("/api/analytics/aggregates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const period = (req.query.period as 'day' | 'week' | 'month') || 'week';

    try {
      const data = await storage.getReadingsAggregate(user.id, period);
      res.json(data);
    } catch (err) {
      console.error("Analytics Error:", err);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Advanced AI Operational Routes
  app.get("/api/ai/incidents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const devices = await storage.getDevices(user.id, user.role);
    const readings = await storage.getRecentReadings(user.id, user.role, 50);

    const summary = await analyzeIncidents(readings, devices);
    res.json({ summary });
  });

  app.get("/api/ai/health", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const readings = await storage.getRecentReadings(user.id, user.role, 100);

    const report = await generateHealthReport(readings);
    res.json({ report });
  });

  app.post("/api/ai/command", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { query } = req.body;

    if (!query) return res.status(400).json({ error: "Missing query parameter" });

    // Fetch full fleet state for context
    const devices = await storage.getDevices(user.id, user.role);
    const readings = await storage.getRecentReadings(user.id, user.role, 40);

    const fleetState = {
      devices: devices.map(d => ({ name: d.name, status: d.status, lastSeen: d.lastSeen })),
      latestReadings: readings.map(r => ({ type: r.type, value: r.value, unit: r.unit }))
    };

    const response = await processNaturalLanguageQuery(query, fleetState);
    res.json({ response });
  });

  return httpServer;
}
