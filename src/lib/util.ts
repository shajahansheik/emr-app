import { randomUUID } from "node:crypto";

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();

/** Local calendar date (YYYY-MM-DD) of the server, honouring the TZ env var. */
export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA");
}

export function ageFrom(dob?: string) {
  if (!dob) return "";
  const b = new Date(dob);
  if (isNaN(b.getTime())) return "";
  const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age >= 0 ? `${age}y` : "";
}

export function fmtDateTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}
