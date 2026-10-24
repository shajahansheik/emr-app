import { getStore } from "./db";
import type {
  Appointment,
  ClinicalRole,
  FieldValue,
  FormDefinition,
  FormField,
  FormGroup,
  FormSubmission,
  TableRow,
} from "./types";
import { newId, nowIso } from "./util";

const opts = (...o: string[]) => o;

type NewForm = Omit<FormDefinition, "id" | "createdAt" | "updatedAt">;

const REGISTRATION_FORM: NewForm = {
  key: "patient_registration",
  name: "Patient Registration",
  purpose: "patient_registration",
  description: "Used by nurses (or doctors in nurse-less clinics) to register patients.",
  active: true,
  builtIn: true,
  fields: [
    { key: "fullName", label: "Full name", type: "text", required: true, system: true, width: "half" },
    { key: "gender", label: "Gender", type: "select", required: true, system: true, options: opts("Male", "Female", "Other"), width: "half" },
    { key: "dob", label: "Date of birth", type: "date", required: true, system: true, width: "half" },
    { key: "phone", label: "Mobile number", type: "phone", required: true, system: true, width: "half" },
    { key: "email", label: "Email", type: "email", width: "half" },
    { key: "bloodGroup", label: "Blood group", type: "select", options: opts("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"), width: "half" },
    { key: "address", label: "Address", type: "textarea", width: "full" },
    { key: "emergencyContact", label: "Emergency contact (name & phone)", type: "text", width: "half" },
    { key: "allergies", label: "Known allergies", type: "text", width: "half" },
  ],
};

const LEGACY_PURPOSES = ["vitals", "case_sheet", "consultation_extra"];

/**
 * Creates the registration form. No clinical forms are seeded: admins build every nurse and
 * doctor form in the Form Builder. Forms from installs before form groups existed are
 * converted to clinical forms so the admin can map them to a group.
 */
export async function ensureDefaultForms() {
  const store = getStore();
  const forms = await store.list<FormDefinition>("forms");
  if (!forms.some((f) => f.purpose === "patient_registration")) {
    const t = nowIso();
    await store.insert<FormDefinition>("forms", { ...REGISTRATION_FORM, id: newId(), createdAt: t, updatedAt: t });
  }
  for (const f of forms) {
    if (LEGACY_PURPOSES.includes(f.purpose as string)) {
      await store.update<FormDefinition>("forms", f.id, { purpose: "clinical", builtIn: false, active: true });
    }
  }
}

export async function getRegistrationForm() {
  await ensureDefaultForms();
  const forms = await getStore().list<FormDefinition>("forms");
  return forms.find((f) => f.purpose === "patient_registration")!;
}

export async function listForms() {
  await ensureDefaultForms();
  return getStore().list<FormDefinition>("forms");
}

export interface ResolvedGroup {
  group: FormGroup;
  forms: FormDefinition[];
}

/**
 * The active form groups for a case sheet, in display order. A group applies when it is
 * assigned to the role (all doctors / all nurses) or to the specific user, and to the clinic.
 * A form that appears in several groups is shown only once, in its first group.
 */
export async function resolveGroups(opts: { role: ClinicalRole; userId?: string | null; clinicId: string }): Promise<ResolvedGroup[]> {
  await ensureDefaultForms();
  const store = getStore();
  const [groups, forms] = await Promise.all([store.list<FormGroup>("form_groups"), store.list<FormDefinition>("forms")]);
  const byId = new Map(forms.map((f) => [f.id, f]));
  const seen = new Set<string>();
  return groups
    .filter((g) => g.active)
    .filter((g) => g.roles.includes(opts.role) || (!!opts.userId && g.userIds.includes(opts.userId)))
    .filter((g) => g.clinicIds.length === 0 || g.clinicIds.includes(opts.clinicId))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((group) => ({
      group,
      forms: group.formIds
        .map((id) => byId.get(id))
        .filter((f): f is FormDefinition => !!f && f.purpose === "clinical" && !seen.has(f.id) && !!seen.add(f.id)),
    }))
    .filter((r) => r.forms.length > 0);
}

/** Nurse-side case sheet forms. Doctors in nurse-less clinics fill the same forms. */
export function nurseGroupsFor(appt: Appointment, user: { id: string; role: string }) {
  return resolveGroups({ role: "nurse", userId: user.role === "nurse" ? user.id : null, clinicId: appt.clinicId });
}

/** Doctor-side case sheet forms for the doctor the appointment is assigned to. */
export function doctorGroupsFor(appt: Appointment) {
  return resolveGroups({ role: "doctor", userId: appt.doctorId, clinicId: appt.clinicId });
}

export const formPrefix = (key: string) => `x_${key}__`;

/** All form submissions of an appointment, including data saved before form groups existed. */
export function submissionsOf(appt: Appointment): Record<string, FormSubmission> {
  return {
    ...(appt.vitals ? { vitals: appt.vitals } : {}),
    ...(appt.caseSheet ? { case_sheet: appt.caseSheet } : {}),
    ...(appt.extraForms ?? {}),
    ...(appt.forms ?? {}),
  };
}

/** First non-empty value of a field key across all forms (e.g. "diagnosis", "followUp"). */
export function findValue(appt: Appointment, key: string): string {
  for (const s of Object.values(submissionsOf(appt))) {
    const v = s.data[key];
    if (v !== undefined && v !== null && v !== "" && !Array.isArray(v)) return String(v);
  }
  return "";
}

/** Read the values of a dynamic form out of submitted FormData (inputs are named `<prefix><key>`). */
export function readFormValues(fields: FormField[], fd: FormData, prefix = "f_") {
  const values: Record<string, FieldValue> = {};
  const errors: string[] = [];
  for (const f of fields) {
    if (f.type === "heading") continue;
    const name = prefix + f.key;
    let v: FieldValue;
    if (f.type === "checkbox") v = fd.get(name) === "on";
    else if (f.type === "multiselect") v = fd.getAll(name).map(String).filter(Boolean);
    else if (f.type === "table") {
      let rows: TableRow[] = [];
      try {
        rows = JSON.parse(String(fd.get(name) ?? "[]"));
      } catch {}
      const cols = f.columns ?? [];
      v = (Array.isArray(rows) ? rows : [])
        .map((r) => Object.fromEntries(cols.map((c) => [c.key, String(r?.[c.key] ?? "").trim()])))
        .filter((r) => Object.values(r).some(Boolean));
    } else if (f.type === "number") {
      const raw = String(fd.get(name) ?? "").trim();
      v = raw === "" ? null : Number(raw);
      if (v !== null && isNaN(v)) errors.push(`${f.label} must be a number`);
    } else v = String(fd.get(name) ?? "").trim();
    const empty = v === null || v === "" || v === false || (Array.isArray(v) && v.length === 0);
    if (f.required && empty) errors.push(`${f.label} is required`);
    values[f.key] = v;
  }
  return { values, errors };
}

/** Read every form of the given groups; returns submissions keyed by form key. */
export function readGroupValues(groups: ResolvedGroup[], fd: FormData) {
  const values: Record<string, Record<string, FieldValue>> = {};
  const errors: string[] = [];
  for (const { forms } of groups) {
    for (const form of forms) {
      const r = readFormValues(form.fields, fd, formPrefix(form.key));
      values[form.key] = r.values;
      errors.push(...r.errors.map((e) => `${form.name}: ${e}`));
    }
  }
  return { values, errors };
}

export function displayValue(f: FormField, v: FieldValue | undefined) {
  if (v === undefined || v === null || v === "") return "";
  if (f.type === "table" && Array.isArray(v)) {
    const cols = f.columns ?? [];
    return (v as TableRow[]).map((r) => cols.map((c) => r[c.key]).filter(Boolean).join(" – ")).join("\n");
  }
  if (Array.isArray(v)) {
    const items = (v as unknown[]).map((x) => (x && typeof x === "object" ? Object.values(x).filter(Boolean).join(" – ") : String(x)));
    return items.join(items.some((x) => x.includes(" – ")) ? "\n" : ", ");
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return f.unit ? `${v} ${f.unit}` : String(v);
}

/**
 * Filled forms of a visit in display order: nurse groups first, then doctor groups, then
 * anything else (e.g. a form that has since been deleted, shown with its raw field keys).
 */
export async function filledForms(appt: Appointment, opts: { exclude?: Set<string> } = {}) {
  const store = getStore();
  const [forms, groups] = await Promise.all([store.list<FormDefinition>("forms"), store.list<FormGroup>("form_groups")]);
  const subs = submissionsOf(appt);
  const byId = new Map(forms.map((f) => [f.id, f]));
  const rank = (g: FormGroup) => (g.roles.includes("nurse") ? 0 : 1);
  const orderedKeys: string[] = [];
  for (const g of [...groups].sort((a, b) => rank(a) - rank(b) || a.order - b.order)) {
    for (const id of g.formIds) {
      const k = byId.get(id)?.key;
      if (k && !orderedKeys.includes(k)) orderedKeys.push(k);
    }
  }
  const keys = [...orderedKeys.filter((k) => subs[k]), ...Object.keys(subs).filter((k) => !orderedKeys.includes(k))];
  return keys
    .filter((k) => !opts.exclude?.has(k))
    .map((k) => {
      const form =
        forms.find((f) => f.key === k) ??
        ({
          key: k,
          name: k.replace(/_/g, " "),
          fields: Object.keys(subs[k].data).map((fk) => ({ key: fk, label: fk, type: "text" })),
        } as unknown as FormDefinition);
      return { form, submission: subs[k] };
    });
}
