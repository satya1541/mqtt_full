import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: "40.192.42.60",
    port: 3306,
    user: "testing",
    password: "testing@2025",
    database: "DGMR",
  },
});
