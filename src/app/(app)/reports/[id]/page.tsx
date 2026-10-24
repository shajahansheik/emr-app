import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canViewAppointment } from "@/lib/permissions";
import { displayValue, filledForms } from "@/lib/forms";
import { PrintButton } from "@/components/PrintButton";
import type { Appointment, Clinic, FormDefinition, FormSubmission, Patient, TableRow, User } from "@/lib/types";
import { RowsTable } from "@/components/Views";
import { ageFrom, fmtDateTime } from "@/lib/util";

function Section({ title, form, sub }: { title: string; form: FormDefinition; sub: FormSubmission }) {
  const rows = form.fields.filter((f) => f.type !== "heading" && displayValue(f, sub.data[f.key]) !== "");
  if (!rows.length) return null;
  return (
    <section className="report-section">
      <h3>{title}</h3>
      <table className="report-table">
        <tbody>
          {rows.map((f) =>
            f.type === "table" ? (
              <tr key={f.key}><td colSpan={2}><div className="report-sub">{f.label}</div><RowsTable field={f} rows={sub.data[f.key] as TableRow[]} /></td></tr>
            ) : (
              <tr key={f.key}><th>{f.label}</th><td className="pre">{displayValue(f, sub.data[f.key])}</td></tr>
            )
          )}
        </tbody>
      </table>
    </section>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, clinic: myClinic } = await requireUser();
  const store = getStore();
  const appt = await store.get<Appointment>("appointments", (await params).id);
  const inMyClinic = appt && user.clinicId === appt.clinicId;
  if (!appt || !(canViewAppointment(user, myClinic, appt) || inMyClinic)) notFound();
  const [patient, clinic, doctor, sections] = await Promise.all([
    store.get<Patient>("patients", appt.patientId),
    store.get<Clinic>("clinics", appt.clinicId),
    store.get<User>("users", appt.doctorId),
    filledForms(appt),
  ]);

  return (
    <>
      <div className="page-head no-print">
        <h1>Consultation report</h1>
        <div className="row-actions">
          <Link href={user.role === "admin" ? "/reports" : "/queue"} className="btn">Back</Link>
          <PrintButton />
        </div>
      </div>
      {appt.status !== "completed" && <div className="alert alert-error no-print">This case is not completed yet — the report is a draft.</div>}
      <article className="report">
        <header className="report-head">
          <div>
            <div className="report-clinic">{clinic?.name ?? "Clinic"}</div>
            <div className="muted small">{[clinic?.address, clinic?.phone].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="report-doc">
            <strong>Dr. {appt.doctorName}</strong>
            {doctor?.specialization && <div className="small">{doctor.specialization}</div>}
          </div>
        </header>
        <table className="report-meta">
          <tbody>
            <tr>
              <th>Patient</th><td>{patient?.fullName ?? appt.patientName}</td>
              <th>MRN</th><td>{patient?.mrn}</td>
            </tr>
            <tr>
              <th>Age / Sex</th><td>{[ageFrom(patient?.dob), patient?.gender].filter(Boolean).join(" / ")}</td>
              <th>Phone</th><td>{patient?.phone}</td>
            </tr>
            <tr>
              <th>Visit</th><td>{appt.date} {appt.time} (token #{appt.tokenNo})</td>
              <th>Allergies</th><td>{String(patient?.data.allergies ?? "") || "None reported"}</td>
            </tr>
          </tbody>
        </table>
        {sections.map(({ form, submission }) => (
          <Section key={form.key} title={form.name} form={form} sub={submission} />
        ))}
        <footer className="report-foot">
          <div className="small muted">
            {appt.completedAt ? `Completed ${fmtDateTime(appt.completedAt)}` : "Draft"} · Generated {fmtDateTime(new Date().toISOString())}
          </div>
          <div className="signature">
            <div className="sig-line" />
            Dr. {appt.doctorName}
          </div>
        </footer>
      </article>
    </>
  );
}
