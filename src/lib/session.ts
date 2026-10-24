import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role, SessionUser, User, Clinic } from "./types";
import { getStore } from "./db";

export const SESSION_COOKIE = "emr_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

let cachedSecret: Uint8Array | null = null;
function secret() {
  if (cachedSecret) return cachedSecret;
  let s = process.env.SESSION_SECRET;
  if (!s) {
    // Development fallback: generate once and keep it in the data folder.
    const file = path.join(/* turbopackIgnore: true */ process.cwd(), "data", ".session-secret");
    try {
      s = fs.readFileSync(file, "utf8").trim();
    } catch {
      s = randomBytes(32).toString("hex");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, s, { mode: 0o600 });
    }
  }
  cachedSecret = new TextEncoder().encode(s);
  return cachedSecret;
}

export async function createSession(user: User) {
  const payload: SessionUser = { id: user.id, name: user.name, role: user.role, clinicId: user.clinicId };
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    // Re-check the account so deactivated/deleted users lose access immediately.
    const user = await getStore().get<User>("users", payload.id as string);
    if (!user || !user.active) return null;
    return { id: user.id, name: user.name, role: user.role, clinicId: user.clinicId };
  } catch {
    return null;
  }
}

export interface Context {
  user: SessionUser;
  clinic: Clinic | null;
}

/** Use in pages and actions: returns the logged-in user or redirects to /login. */
export async function requireUser(roles?: Role[]): Promise<Context> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/");
  const clinic = user.clinicId ? await getStore().get<Clinic>("clinics", user.clinicId) : null;
  return { user, clinic };
}
