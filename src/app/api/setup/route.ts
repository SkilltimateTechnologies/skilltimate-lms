import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { runSeed } from "@/db/seed";

// One-time bootstrap: seeds demo content into an EMPTY database.
// Guarded by ?key= matching SETUP_KEY (or BETTER_AUTH_SECRET).
// Refuses to run if any course already exists — it can never wipe data.
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  const expected = process.env.SETUP_KEY || process.env.BETTER_AUTH_SECRET;
  if (!expected || key !== expected) {
    return NextResponse.json({ error: "Invalid setup key" }, { status: 403 });
  }
  try {
    const { applyMigrations } = await import("@/lib/migrate");
    await applyMigrations();
    const [{ n }] = (await db.all(sql`SELECT COUNT(*) AS n FROM courses`)) as { n: number }[];
    if (Number(n) > 0) {
      return NextResponse.json({ ok: true, status: "already-initialized", courses: Number(n) });
    }
    await runSeed({ wipe: false });
    return NextResponse.json({
      ok: true,
      status: "seeded",
      accounts: ["arup@skilltimate.com (admin)", "demo@skilltimate.com (student)"],
      invite: "AZ900-LAUNCH",
      note: "Change both seeded passwords now.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
