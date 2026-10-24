"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { ensureDefaultForms } from "@/lib/forms";
import { audit } from "@/lib/audit";
import type { Clinic, User } from "@/lib/types";
import { newId, nowIso, str } from "@/lib/util";
import type { ActionState } from "./state";

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const username = str(fd.get("username")).toLowerCase();
  const password = str(fd.get("password"));
  const users = await getStore().list<User>("users");
  const user = users.find((u) => u.username === username);
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid username or password" };
  }
  await createSession(user);
  await audit(user, "login", "user", user.id, `${user.name} logged in`);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/** First-run wizard: creates the first clinic and the admin account. */
export async function setup(_: ActionState, fd: FormData): Promise<ActionState> {
  const store = getStore();
  if ((await store.list<User>("users")).length > 0) redirect("/login");
  const clinicName = str(fd.get("clinicName"));
  const name = str(fd.get("name"));
  const username = str(fd.get("username")).toLowerCase();
  const password = str(fd.get("password"));
  if (!clinicName || !name || !username) return { error: "All fields are required" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== str(fd.get("confirm"))) return { error: "Passwords do not match" };

  const t = nowIso();
  const clinic: Clinic = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    name: clinicName,
    nurseEnabled: fd.get("nurseEnabled") === "on",
  };
  await store.insert("clinics", clinic);
  const admin: User = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    name,
    username,
    passwordHash: await bcrypt.hash(password, 10),
    role: "admin",
    clinicId: null,
    active: true,
  };
  await store.insert("users", admin);
  await ensureDefaultForms();
  await audit(admin, "setup", "system", clinic.id, `Initial setup: clinic "${clinicName}", admin "${username}"`);
  await createSession(admin);
  redirect("/dashboard");
}
