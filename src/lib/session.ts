import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const s = await getSession();
  if (!s) throw new AuthError("Sign in required", 401);
  return s;
}

export async function requireRole(...roles: string[]) {
  const s = await requireUser();
  if (!roles.includes(s.user.role as string)) throw new AuthError("Forbidden", 403);
  return s;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
