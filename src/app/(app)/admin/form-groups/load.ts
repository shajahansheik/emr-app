import { getStore } from "@/lib/db";
import { listForms } from "@/lib/forms";
import type { Clinic, User } from "@/lib/types";

/** Data the group editor needs: clinical forms, clinics, doctors and nurses. */
export async function loadEditorData() {
  const store = getStore();
  const [forms, clinics, users] = await Promise.all([listForms(), store.list<Clinic>("clinics"), store.list<User>("users")]);
  const cname = new Map(clinics.map((c) => [c.id, c.name]));
  return {
    forms: forms.filter((f) => f.purpose === "clinical").map((f) => ({
      id: f.id, name: f.name, fields: f.fields.filter((x) => x.type !== "heading").length,
    })),
    clinics: clinics.map((c) => ({ id: c.id, name: c.name })),
    users: users
      .filter((u) => u.role !== "admin" && u.active)
      .map((u) => ({ id: u.id, label: `${u.role === "doctor" ? "Dr. " : ""}${u.name}`, role: u.role, clinic: u.clinicId ? cname.get(u.clinicId) ?? "" : "" })),
  };
}
