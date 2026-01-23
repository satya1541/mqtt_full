import { mysqlTable, serial, text, varchar, int, float, timestamp, boolean } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = mysqlTable("sessions", {
  session_id: varchar("session_id", { length: 128 }).primaryKey(),
  expires: int("expires").notNull(),
  data: text("data"),
});

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  fullName: varchar("full_name", { length: 255 }),
  location: varchar("location", { length: 255 }),
  division: varchar("division", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  publicTelemetry: boolean("public_telemetry").default(false),
  remoteDebugging: boolean("remote_debugging").default(true),
  deviceFingerprinting: boolean("device_fingerprinting").default(true),
  floorPlanImage: text("floor_plan_image"), // URL or base64 of the floor plan
});

export const devices = mysqlTable("devices", {
  id: int("id").primaryKey().autoincrement(),
  ownerId: varchar("owner_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  uniqueId: varchar("unique_id", { length: 100 }), // e.g. MAC address
  broker: varchar("broker", { length: 255 }),
  protocol: varchar("protocol", { length: 50 }).default("mqtt"),
  topic: varchar("topic", { length: 255 }),
  username: varchar("username", { length: 255 }),
  password: text("password"),
  status: varchar("status", { length: 50 }).notNull().default("offline"),
  description: text("description"),
  lastSeen: timestamp("last_seen").defaultNow(),
  xPosition: float("x_position").default(0), // 0-100% relative X
  yPosition: float("y_position").default(0), // 0-100% relative Y
});

export const readings = mysqlTable("readings", {
  id: int("id").primaryKey().autoincrement(),
  deviceId: int("device_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  value: float("value"),
  stringValue: text("string_value"),
  unit: varchar("unit", { length: 20 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const widgetPreferences = mysqlTable("widget_preferences", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  sensorType: varchar("sensor_type", { length: 50 }).notNull(),
  visible: boolean("visible").default(true),
  order: int("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  location: true,
  division: true,
});

export const insertDeviceSchema = createInsertSchema(devices).pick({
  name: true,
  description: true,
  uniqueId: true,
  broker: true,
  protocol: true,
  topic: true,
  username: true,
  password: true,
});

export const insertReadingSchema = createInsertSchema(readings).pick({
  deviceId: true,
  type: true,
  value: true,
  unit: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

export type InsertReading = z.infer<typeof insertReadingSchema>;
export type Reading = typeof readings.$inferSelect;

export const insertWidgetPreferenceSchema = createInsertSchema(widgetPreferences).pick({
  userId: true,
  sensorType: true,
  visible: true,
  order: true,
});

export type InsertWidgetPreference = z.infer<typeof insertWidgetPreferenceSchema>;
export type WidgetPreference = typeof widgetPreferences.$inferSelect;

export const alertRules = mysqlTable("alert_rules", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sensorType: varchar("sensor_type", { length: 100 }).notNull(),
  conditionOperator: varchar("condition_operator", { length: 10 }).notNull(), // '>', '<', '=', '>=', '<='
  conditionValue: float("condition_value").notNull(),
  severity: varchar("severity", { length: 20 }).default("warning"), // 'info', 'warning', 'critical'
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAlertRuleSchema = createInsertSchema(alertRules).pick({
  userId: true,
  name: true,
  sensorType: true,
  conditionOperator: true,
  conditionValue: true,
  severity: true,
  enabled: true,
});

export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type AlertRule = typeof alertRules.$inferSelect;

export const metadata = mysqlTable("metadata", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  originalKey: varchar("original_key", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull().default("other"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMetadataSchema = createInsertSchema(metadata).pick({
  userId: true,
  originalKey: true,
  label: true,
  unit: true,
  description: true,
  category: true,
});

export type InsertMetadata = z.infer<typeof insertMetadataSchema>;
export type Metadata = typeof metadata.$inferSelect;

