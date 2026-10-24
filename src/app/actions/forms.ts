"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import type { ClinicalRole, FieldType, FormDefinition, FormField, FormGroup, User, Clinic } from "@/lib/types";
import { newId, nowIso, str } from "@/lib/util";
import type { ActionState } from "./state";

const TYPES: FieldType[] = ["text", "textarea", "number", "date", "time", "email", "phone", "select", "radio", "checkbox", "multiselect", "table", "heading"];
const COLUMN_TYPES = ["text", "number", "select", "date"];
const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const CHOICE: FieldType[] = ["select", "radio", "multiselect"];

export async function saveForm(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser(["admin"]);
  const store = getStore();
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  const description = str(fd.get("description"));
  let fields: FormField[];
  try {
    fields = JSON.parse(str(fd.get("fields")));
  } catch {
    return { error: "Invalid form data" };
  }
  if (!name) return { error: "Form name is required" };
  if (!fields.length) return { error: "Add at least one field" };

  const keys = new Set<string>();
  for (const f of fields) {
    if (!f.label?.trim()) return { error: "Every field needs a label" };
    if (!KEY_RE.test(f.key)) return { error: `Invalid field key "${f.key}" (letters, numbers, _)` };
    if (keys.has(f.key)) return { error: `Duplicate field key "${f.key}"` };
    if (!TYPES.includes(f.type)) return { error: `Invalid type for ${f.label}` };
    if (CHOICE.includes(f.type) && !f.options?.length) return { error: `${f.label}: add at least one option` };
    keys.add(f.key);
    f.label = f.label.trim();
    if (!CHOICE.includes(f.type)) delete f.options;
    if (f.type === "table") {
      const cols = f.columns ?? [];
      if (!cols.length) return { error: `${f.label}: add at least one column` };
      const colKeys = new Set<string>();
      for (const c of cols) {
        if (!c.label?.trim()) return { error: `${f.label}: every column needs a label` };
        if (!KEY_RE.test(c.key) || colKeys.has(c.key)) return { error: `${f.label}: invalid or duplicate column key "${c.key}"` };
        if (!COLUMN_TYPES.includes(c.type)) return { error: `${f.label}: invalid column type` };
        if (c.type === "select" && !c.options?.length) return { error: `${f.label} → ${c.label}: add at least one option` };
        if (c.type !== "select") delete c.options;
        c.label = c.label.trim();
        colKeys.add(c.key);
      }
    } else delete f.columns;
  }

  if (id) {
    const existing = await store.get<FormDefinition>("forms", id);
    if (!existing) return { error: "Form not found" };
    // System fields drive application logic: they must stay, with their type and required flag.
    for (const sf of existing.fields.filter((f) => f.system)) {
      const f = fields.find((x) => x.key === sf.key);
      if (!f) return { error: `"${sf.label}" is a system field and cannot be removed` };
      f.type = sf.type;
      f.system = true;
      f.required = sf.required;
    }
    await store.update<FormDefinition>("forms", id, {
      name,
      description,
      fields,
    });
    await audit(user, "update", "form", id, `Updated form "${name}" (${fields.length} fields)`);
  } else {
    let key = str(fd.get("key")) || name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const all = await store.list<FormDefinition>("forms");
    if (all.some((f) => f.key === key)) key = `${key}_${all.length + 1}`;
    const t = nowIso();
    const def: FormDefinition = {
      id: newId(),
      createdAt: t,
      updatedAt: t,
      key,
      name,
      description,
      purpose: "clinical",
      fields: fields.map((f) => ({ ...f, system: false })),
      active: true,
      builtIn: false,
    };
    await store.insert("forms", def);
    await audit(user, "create", "form", def.id, `Created form "${name}"`);
    const groupId = str(fd.get("addToGroup"));
    const group = groupId ? await store.get<FormGroup>("form_groups", groupId) : null;
    if (group) await store.update<FormGroup>("form_groups", group.id, { formIds: [...group.formIds, def.id] });
  }
  revalidatePath("/admin/forms");
  redirect("/admin/forms");
}

export async function deleteForm(fd: FormData) {
  const { user } = await requireUser(["admin"]);
  const store = getStore();
  const form = await store.get<FormDefinition>("forms", str(fd.get("id")));
  if (form && form.purpose !== "patient_registration") {
    await store.remove("forms", form.id);
    for (const g of await store.list<FormGroup>("form_groups")) {
      if (g.formIds.includes(form.id)) await store.update<FormGroup>("form_groups", g.id, { formIds: g.formIds.filter((x) => x !== form.id) });
    }
    await audit(user, "delete", "form", form.id, `Deleted form "${form.name}"`);
  }
  revalidatePath("/admin/forms");
  redirect("/admin/forms");
}

export async function saveFormGroup(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser(["admin"]);
  const store = getStore();
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  if (!name) return { error: "Group name is required" };

  const [forms, users, clinics] = await Promise.all([
    store.list<FormDefinition>("forms"),
    store.list<User>("users"),
    store.list<Clinic>("clinics"),
  ]);
  const formIds = fd.getAll("formIds").map(String).filter((fid) => forms.some((f) => f.id === fid && f.purpose === "clinical"));
  const roles = fd.getAll("roles").map(String).filter((r): r is ClinicalRole => r === "doctor" || r === "nurse");
  const userIds = fd.getAll("userIds").map(String).filter((uid) => users.some((u) => u.id === uid && u.role !== "admin"));
  const clinicIds = fd.getAll("clinicIds").map(String).filter((cid) => clinics.some((c) => c.id === cid));
  if (!formIds.length) return { error: "Add at least one form to the group" };
  if (!roles.length && !userIds.length) return { error: "Map the group to doctors, nurses or specific users" };

  const fields = {
    name,
    description: str(fd.get("description")) || undefined,
    formIds: [...new Set(formIds)],
    roles,
    userIds,
    clinicIds,
    order: Number(str(fd.get("order"))) || 1,
    active: fd.get("active") === "on",
  };
  const mapped = [...roles.map((r) => `all ${r}s`), ...(userIds.length ? [`${userIds.length} user(s)`] : [])].join(", ");
  if (id) {
    await store.update<FormGroup>("form_groups", id, fields);
    await audit(user, "update", "form_group", id, `Updated form group "${name}" (${formIds.length} forms → ${mapped})`);
  } else {
    const t = nowIso();
    const g: FormGroup = { id: newId(), createdAt: t, updatedAt: t, ...fields };
    await store.insert("form_groups", g);
    await audit(user, "create", "form_group", g.id, `Created form group "${name}" (${formIds.length} forms → ${mapped})`);
  }
  revalidatePath("/admin/form-groups");
  redirect("/admin/form-groups");
}

export async function deleteFormGroup(fd: FormData) {
  const { user } = await requireUser(["admin"]);
  const store = getStore();
  const g = await store.get<FormGroup>("form_groups", str(fd.get("id")));
  if (g) {
    await store.remove("form_groups", g.id);
    await audit(user, "delete", "form_group", g.id, `Deleted form group "${g.name}"`);
  }
  revalidatePath("/admin/form-groups");
  redirect("/admin/form-groups");
}
