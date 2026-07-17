import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Applies pending SQL files from ./drizzle (drizzle-kit generate output).
 *  Idempotent: tracks applied files in __app_migrations. */
export async function applyMigrations() {
  await db.run(sql`CREATE TABLE IF NOT EXISTS __app_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)`);
  const dir = join(process.cwd(), "drizzle");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set(
    ((await db.all(sql`SELECT name FROM __app_migrations`)) as { name: string }[]).map((r) => r.name)
  );
  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const raw = await readFile(join(dir, file), "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await db.run(sql.raw(stmt));
    }
    await db.run(sql`INSERT INTO __app_migrations (name, applied_at) VALUES (${file}, ${Date.now()})`);
    applied++;
  }
  return { applied, total: files.length };
}
