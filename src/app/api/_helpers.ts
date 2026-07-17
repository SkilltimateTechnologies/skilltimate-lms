import { NextResponse } from "next/server";
import { AuthError, requireUser, requireRole } from "@/lib/session";

type Handler = (user: { id: string; role?: string | null }, body: any, params: Record<string, string>) => Promise<unknown>;

export function route(handler: Handler, opts: { roles?: string[] } = {}) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      const session = opts.roles ? await requireRole(...opts.roles) : await requireUser();
      const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
      const params = ctx?.params ? await Promise.resolve(ctx.params).catch(() => ({})) : {};
      const data = await handler(session.user as never, body, params ?? {});
      return NextResponse.json(data ?? { ok: true });
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
