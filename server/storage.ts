import { type User, type InsertUser, type Device, type InsertDevice, type Reading, type InsertReading, type WidgetPreference, type InsertWidgetPreference, type AlertRule, type InsertAlertRule, type Metadata, type InsertMetadata, users, devices, readings, widgetPreferences, alertRules, metadata } from "@shared/schema";
import { db, poolConnection } from "./db";
import { eq, desc, and, sql, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import session from "express-session";
import MySQLSessionStore from "express-mysql-session";

const MySQLStore = MySQLSessionStore(session);

export interface IStorage {
  sessionStore: session.Store;

  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, update: Partial<User>): Promise<User>;

  // Devices
  getDevices(userId: string, role: string): Promise<Device[]>; // Updated for RBAC
  getDevice(id: number): Promise<Device | undefined>;
  createDevice(device: InsertDevice & { ownerId: string }): Promise<Device>;
  updateDevice(id: number, update: Partial<Device>): Promise<Device>;
  updateDeviceStatus(id: number, status: string): Promise<Device | null>;
  deleteDevice(id: number): Promise<void>;
  updateDevicePosition(id: number, x: number, y: number): Promise<void>;

  // Readings
  addReading(reading: InsertReading): Promise<Reading>;
  getReadings(deviceId: number): Promise<Reading[]>;
  getActiveReadingTypes(userId: string, role: string): Promise<string[]>;
  getRecentReadings(userId: string, role: string, limit?: number): Promise<Reading[]>;

  // Widget Preferences
  getWidgetPreferences(userId: string): Promise<WidgetPreference[]>;
  saveWidgetPreferences(userId: string, preferences: Omit<InsertWidgetPreference, 'userId'>[]): Promise<void>;
  resetWidgetPreferences(userId: string): Promise<void>;

  // Alert Rules
  getAlertRules(userId: string): Promise<AlertRule[]>;
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;
  deleteAlertRule(id: number): Promise<void>;

  // Metadata
  getMetadata(userId: string, role: string): Promise<Metadata[]>;
  getMetadataByKey(key: string, userId: string, role: string): Promise<Metadata | undefined>;
  createMetadata(metadata: InsertMetadata): Promise<Metadata>;
  updateMetadata(key: string, userId: string, update: Partial<Metadata>): Promise<Metadata>;
  deleteMetadata(key: string, userId: string, role: string): Promise<void>;

  // Analytics
  getReadingsAggregate(userId: string, period: 'day' | 'week' | 'month'): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MySQLStore({
      expiration: 86400000,
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      }
    }, poolConnection as any);
  }

  // ... existing user methods ...

  async getRecentReadings(userId: string, role: string, limit: number = 200): Promise<Reading[]> {
    return []; // Return empty array since table is deleted
  }

  async getActiveReadingTypes(userId: string, role: string): Promise<string[]> {
    return []; // Return empty array since table is deleted
  }
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID(); // Application-side UUID generation for MySQL
    const user: User = {
      ...insertUser,
      id,
      role: "user",
      fullName: insertUser.fullName || null,
      location: insertUser.location || null,
      division: insertUser.division || "General", // Default division
      emailNotifications: true,
      pushNotifications: true,
      publicTelemetry: false,
      remoteDebugging: true,
      deviceFingerprinting: true,
      floorPlanImage: null,
    };
    await db.insert(users).values(user);
    return user;
  }

  async updateUser(id: string, update: Partial<User>): Promise<User> {
    await db.update(users).set(update).where(eq(users.id, id));
    const updated = await this.getUser(id);
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async getDevices(userId: string, role: string): Promise<Device[]> {
    if (role === "admin") {
      return await db.select().from(devices);
    } else {
      return await db.select().from(devices).where(eq(devices.ownerId, userId));
    }
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async createDevice(insertDevice: InsertDevice & { ownerId: string }): Promise<Device> {
    const [result] = await db.insert(devices).values(insertDevice);
    // MySQL insert result has insertId
    const id = result.insertId as number;

    // Fetch and return the created device
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    if (!device) throw new Error("Failed to create device");
    return device;
  }

  async updateDevice(id: number, update: Partial<Device>): Promise<Device> {
    await db.update(devices)
      .set(update)
      .where(eq(devices.id, id));

    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    if (!device) throw new Error("Device not found");
    return device;
  }

  async updateDeviceStatus(id: number, status: string): Promise<Device | null> {
    await db.update(devices)
      .set({ status, lastSeen: new Date() })
      .where(eq(devices.id, id));

    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    if (!device) {
      console.warn(`[Storage] Device ${id} not found during status update (likely deleted)`);
      return null;
    }
    return device;
  }

  async deleteDevice(id: number): Promise<void> {
    // Delete readings skipped (table deleted)
    // await db.delete(readings).where(eq(readings.deviceId, id));
    // Delete the device
    await db.delete(devices).where(eq(devices.id, id));
  }

  async updateDevicePosition(id: number, x: number, y: number): Promise<void> {
    await db.update(devices).set({ xPosition: x, yPosition: y }).where(eq(devices.id, id));
  }

  async addReading(insertReading: InsertReading): Promise<Reading> {
    // Return a mock reading since table is deleted
    return {
      id: 0,
      deviceId: insertReading.deviceId,
      type: insertReading.type,
      value: insertReading.value ?? null,
      stringValue: null,
      unit: insertReading.unit,
      timestamp: new Date()
    };
  }

  async getReadings(deviceId: number): Promise<Reading[]> {
    return []; // Return empty array since table is deleted
  }

  // Widget Preferences Methods
  async getWidgetPreferences(userId: string): Promise<WidgetPreference[]> {
    return await db.select()
      .from(widgetPreferences)
      .where(eq(widgetPreferences.userId, userId))
      .orderBy(widgetPreferences.order);
  }

  async saveWidgetPreferences(userId: string, preferences: Omit<InsertWidgetPreference, 'userId'>[]): Promise<void> {
    // Delete existing preferences for this user
    await db.delete(widgetPreferences).where(eq(widgetPreferences.userId, userId));

    // Insert new preferences
    if (preferences.length > 0) {
      await db.insert(widgetPreferences).values(
        preferences.map(pref => ({
          ...pref,
          userId
        }))
      );
    }
  }

  async resetWidgetPreferences(userId: string): Promise<void> {
    await db.delete(widgetPreferences).where(eq(widgetPreferences.userId, userId));
  }

  // Alert Rules Implementation
  async getAlertRules(userId: string): Promise<AlertRule[]> {
    return await db.select().from(alertRules).where(eq(alertRules.userId, userId));
  }

  async createAlertRule(rule: InsertAlertRule): Promise<AlertRule> {
    const [result] = await db.insert(alertRules).values(rule);
    const id = result.insertId as number;
    const [created] = await db.select().from(alertRules).where(eq(alertRules.id, id));
    return created;
  }

  async deleteAlertRule(id: number): Promise<void> {
    await db.delete(alertRules).where(eq(alertRules.id, id));
  }

  // Analytics Implementation
  async getReadingsAggregate(userId: string, period: 'day' | 'week' | 'month'): Promise<any[]> {
    return []; // Return empty array since table is deleted
  }

  // Metadata Implementation
  async getMetadata(userId: string, role: string): Promise<Metadata[]> {
    if (role === "admin") {
      return await db.select().from(metadata);
    } else {
      // Use code-level logic to ensure user overrides system metadata correctly
      const results = await db.select().from(metadata)
        .where(or(
          eq(metadata.userId, userId),
          eq(metadata.userId, 'system')
        ));

      const map = new Map<string, Metadata>();
      // Sort so 'system' is processed first, then actual user IDs overwrite them
      results.sort((a, b) => (a.userId === 'system' ? -1 : 1));
      results.forEach(m => map.set(m.originalKey, m));
      return Array.from(map.values());
    }
  }

  async getMetadataByKey(key: string, userId: string, role: string): Promise<Metadata | undefined> {
    if (role === "admin") {
      const [result] = await db.select().from(metadata).where(eq(metadata.originalKey, key));
      return result;
    } else {
      const results = await db.select().from(metadata)
        .where(and(
          eq(metadata.originalKey, key),
          or(
            eq(metadata.userId, userId),
            eq(metadata.userId, 'system')
          )
        ));

      if (results.length === 0) return undefined;
      // Return user's own if found, else fallback to system
      return results.find(r => r.userId === userId) || results.find(r => r.userId === 'system') || results[0];
    }
  }

  async createMetadata(insertMetadata: InsertMetadata): Promise<Metadata> {
    const [result] = await db.insert(metadata).values(insertMetadata);
    const id = result.insertId as number;
    const [created] = await db.select().from(metadata).where(eq(metadata.id, id));
    if (!created) throw new Error("Failed to create metadata");
    return created;
  }

  async updateMetadata(key: string, userId: string, update: Partial<Metadata>): Promise<Metadata> {
    await db.update(metadata)
      .set({ ...update, updatedAt: new Date() })
      .where(and(eq(metadata.originalKey, key), eq(metadata.userId, userId)));

    const [updated] = await db.select().from(metadata)
      .where(and(eq(metadata.originalKey, key), eq(metadata.userId, userId)));
    if (!updated) throw new Error("Metadata not found");
    return updated;
  }

  async deleteMetadata(key: string, userId: string, role: string): Promise<void> {
    if (role === "admin") {
      await db.delete(metadata).where(eq(metadata.originalKey, key));
    } else {
      await db.delete(metadata)
        .where(and(eq(metadata.originalKey, key), eq(metadata.userId, userId)));
    }
  }
}

export const storage = new DatabaseStorage();
