export type Role = "admin" | "doctor" | "nurse";

export type Collection =
  | "users"
  | "clinics"
  | "patients"
  | "appointments"
  | "forms"
  | "form_groups"
  | "audit_log";

export const COLLECTIONS: Collection[] = [
  "users",
  "clinics",
  "patients",
  "appointments",
  "forms",
  "form_groups",
  "audit_log",
];

export interface BaseDoc {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseDoc {
  name: string;
  username: string;
  passwordHash: string;
  role: Role;
  clinicId: string | null;
  specialization?: string;
  phone?: string;
  active: boolean;
}

export interface Clinic extends BaseDoc {
  name: string;
  address?: string;
  phone?: string;
  /**
   * When false the clinic has no nurse / front-desk computer user, so doctors
   * register patients, book appointments and capture vitals themselves.
   */
  nurseEnabled: boolean;
}

export interface Patient extends BaseDoc {
  mrn: string;
  clinicId: string;
  fullName: string;
  phone: string;
  gender: string;
  dob: string;
  /** Values of every field in the patient registration form, keyed by field key. */
  data: Record<string, FieldValue>;
  createdBy: string;
}

export type AppointmentStatus =
  | "booked"
  | "vitals_done"
  | "in_consultation"
  | "completed"
  | "cancelled";

export interface FormSubmission {
  data: Record<string, FieldValue>;
  by: string;
  byName: string;
  at: string;
}

export interface Appointment extends BaseDoc {
  clinicId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  reason: string;
  status: AppointmentStatus;
  tokenNo: number;
  /** Submissions of every clinical form filled for this visit, keyed by form key. */
  forms?: Record<string, FormSubmission>;
  /** @deprecated legacy fields from before form groups; read through submissionsOf(). */
  vitals?: FormSubmission;
  /** @deprecated */
  caseSheet?: FormSubmission;
  /** @deprecated */
  extraForms?: Record<string, FormSubmission>;
  completedAt?: string;
  createdBy: string;
}

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "email"
  | "phone"
  | "select"
  | "radio"
  | "checkbox"
  | "multiselect"
  | "table"
  | "heading";

export type TableRow = Record<string, string>;
export type FieldValue = string | number | boolean | string[] | TableRow[] | null;

/** A column of a "table" field (repeating rows, e.g. one row per medicine). */
export interface TableColumn {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  options?: string[];
}

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  unit?: string;
  /** Grid width: full row or half row. */
  width?: "full" | "half";
  /** Columns, for "table" fields. */
  columns?: TableColumn[];
  /** System fields are used by the application logic and cannot be removed. */
  system?: boolean;
}

/** patient_registration is the single registration form; every other form is a clinical form used in groups. */
export type FormPurpose = "patient_registration" | "clinical";

export type ClinicalRole = "doctor" | "nurse";

/**
 * An ordered set of clinical forms shown together on a case sheet, assigned to
 * all doctors and/or nurses, or to specific users, optionally limited to some clinics.
 */
export interface FormGroup extends BaseDoc {
  name: string;
  description?: string;
  formIds: string[];
  roles: ClinicalRole[];
  userIds: string[];
  /** Empty means every clinic. */
  clinicIds: string[];
  order: number;
  active: boolean;
}

export interface FormDefinition extends BaseDoc {
  key: string;
  name: string;
  purpose: FormPurpose;
  description?: string;
  fields: FormField[];
  active: boolean;
  builtIn: boolean;
}

export interface AuditEntry extends BaseDoc {
  userId: string;
  userName: string;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
}

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  clinicId: string | null;
}
