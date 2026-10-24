"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import type { Appointment, Clinic, Role, User } from "@/lib/types";
import { newId, nowIso, str } from "@/lib/util";
import type { ActionState } from "./state";

const ROLES: Role[] = ["admin", "doctor", "nurse"];

export async function saveUser(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireUser(["admin"]);
  const store = getStore();
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  const username = str(fd.get("username")).toLowerCase();
  const role = str(fd.get("role")) as Role;
  const clinicId = str(fd.get("clinicId")) || null;
  const password = str(fd.get("password"));
  const active = fd.get("active") === "on";

  if (!name || !username) return { error: "Name and username are required" };
  if (!/^[a-z0-9._-]{3,}$/.test(username)) return { error: "Username: at least 3 characters, letters/numbers/._- only" };
  if (!ROLES.includes(role)) return { error: "Invalid role" };
  if (role !== "admin" && !clinicId) return { error: "Doctors and nurses must belong to a clinic" };
  if ((!id || password) && password.length < 8) return { error: "Password must be at least 8 characters" };

  const users = await store.list<User>("users");
  if (users.some((u) => u.username === username && u.id !== id)) return { error: "Username already exists" };

  const fields = {
    name,
    username,
    role,
    clinicId: role === "admin" ? null : clinicId,
    specialization: str(fd.get("specialization")) || undefined,
    phone: str(fd.get("phone")) || undefined,
    active,
    ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
  };

  if (id) {
    if (id === me.id && (!active || role !== "admin")) return { error: "You cannot deactivate or demote your own account" };
    await store.update<User>("users", id, fields);
    await audit(me, "update", "user", id, `Updated ${role} ${username}${password ? " (password reset)" : ""}`);
  } else {
    const t = nowIso();
    const u = { id: newId(), createdAt: t, updatedAt: t, ...fields } as User;
    await store.insert("users", u);
    await audit(me, "create", "user", u.id, `Created ${role} ${username}`);
  }
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUser(fd: FormData) {
  const { user: me } = await requireUser(["admin"]);
  const id = str(fd.get("id"));
  if (id === me.id) redirect("/admin/users?error=" + encodeURIComponent("You cannot delete your own account"));
  const store = getStore();
  const target = await store.get<User>("users", id);
  if (!target) redirect("/admin/users");
  const appts = await store.list<Appointment>("appointments");
  if (appts.some((a) => a.doctorId === id || a.createdBy === id)) {
    // Keep clinical history intact: users with records are deactivated instead of deleted.
    await store.update<User>("users", id, { active: false });
    await audit(me, "deactivate", "user", id, `Deactivated ${target.username} (has clinical records)`);
    redirect("/admin/users?message=" + encodeURIComponent(`${target.name} has clinical records, so the account was deactivated instead of deleted.`));
  }
  await store.remove("users", id);
  await audit(me, "delete", "user", id, `Deleted ${target.role} ${target.username}`);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function saveClinic(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireUser(["admin"]);
  const store = getStore();
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  if (!name) return { error: "Clinic name is required" };
  const fields = {
    name,
    address: str(fd.get("address")) || undefined,
    phone: str(fd.get("phone")) || undefined,
    nurseEnabled: fd.get("nurseEnabled") === "on",
  };
  if (id) {
    await store.update<Clinic>("clinics", id, fields);
    await audit(me, "update", "clinic", id, `Updated clinic ${name} (nurse ${fields.nurseEnabled ? "enabled" : "disabled"})`);
  } else {
    const t = nowIso();
    const c: Clinic = { id: newId(), createdAt: t, updatedAt: t, ...fields };
    await store.insert("clinics", c);
    await audit(me, "create", "clinic", c.id, `Created clinic ${name}`);
  }
  revalidatePath("/admin/clinics");
  redirect("/admin/clinics");
}

export async function deleteClinic(fd: FormData) {
  const { user: me } = await requireUser(["admin"]);
  const store = getStore();
  const id = str(fd.get("id"));
  const [users, appts] = await Promise.all([store.list<User>("users"), store.list<Appointment>("appointments")]);
  if (users.some((u) => u.clinicId === id) || appts.some((a) => a.clinicId === id)) {
    redirect("/admin/clinics?error=" + encodeURIComponent("Clinic has users or appointments and cannot be deleted"));
  }
  await store.remove("clinics", id);
  await audit(me, "delete", "clinic", id, "Deleted clinic");
  revalidatePath("/admin/clinics");
  redirect("/admin/clinics");
}
