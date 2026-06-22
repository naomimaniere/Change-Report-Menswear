import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "mdv_auth";

function expectedToken(): string {
  const secret = process.env.AUTH_SECRET ?? "";
  // Sign a constant string with the secret. The cookie value must equal this.
  return createHmac("sha256", secret).update("mdv-cp-diff-v1").digest("hex");
}

export function checkPassword(submitted: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) return false;
  // Constant-time comparison to avoid timing attacks
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function makeAuthCookieValue(): string {
  return expectedToken();
}

export function cookieIsValid(value: string | undefined): boolean {
  if (!value) return false;
  const expected = expectedToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAuthed(): Promise<boolean> {
  const c = await cookies();
  return cookieIsValid(c.get(AUTH_COOKIE)?.value);
}
