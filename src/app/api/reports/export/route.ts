import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getStore } from "@/lib/db";
import { displayValue, listForms, submissionsOf } from "@/lib/forms";
import type { Appointment, Patient } from "@/lib/types";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of completed consultations in a date range (doctor: own cases, admin: all), one column per form field. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "doctor" && user.role !== "admin")) return new NextResponse("Unauthorized", { status: 401 });
  const from = req.nextUrl.searchParams.get("from") ?? "0000-00-00";
  const to = req.nextUrl.searchParams.get("to") ?? "9999-99-99";
  const store = getStore();
  const [appts, patients, forms] = await Promise.all([
    store.list<Appointment>("appointments"),
    store.list<Patient>("patients"),
    listForms(),
  ]);
  const rows = appts
    .filter((a) => a.status === "completed" && a.date >= from && a.date <= to && (user.role === "admin" || a.doctorId === user.id))
    .sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  const subs = rows.map(submissionsOf);
  // Only forms that were filled in at least one exported visit get columns.
  const used = forms.filter((f) => f.purpose === "clinical" && subs.some((s) => s[f.key]));
  const cols = used.flatMap((form) => form.fields.filter((f) => f.type !== "heading").map((field) => ({ form, field })));
  const pmap = new Map(patients.map((p) => [p.id, p]));

  const header = ["Date", "Time", "Token", "MRN", "Patient", "Gender", "DOB", "Phone", "Doctor",
    ...cols.map(({ form, field }) => `${form.name}: ${field.label}`), "Completed at"];
  const lines = [header.map(esc).join(",")];
  rows.forEach((a, i) => {
    const p = pmap.get(a.patientId);
    lines.push([
      a.date, a.time, a.tokenNo, p?.mrn, a.patientName, p?.gender, p?.dob, p?.phone, a.doctorName,
      ...cols.map(({ form, field }) => displayValue({ ...field, unit: undefined }, subs[i][form.key]?.data[field.key]).replace(/\n/g, "; ")),
      a.completedAt,
    ].map(esc).join(","));
  });
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="consultations_${from}_${to}.csv"`,
    },
  });
}
