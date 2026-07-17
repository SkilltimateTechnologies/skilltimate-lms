import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL || "file:local.db";
const isTurso = url.startsWith("libsql");

export default defineConfig(
  isTurso
    ? {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: { url, authToken: process.env.TURSO_AUTH_TOKEN! },
      }
    : {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: { url: url.replace("file:", "") },
      }
);
