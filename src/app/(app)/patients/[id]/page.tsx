import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canDoFrontDesk } from "@/lib/permissions";
import { findValue, getRegistrationForm } from "@/lib/forms";
import type { Appointment, Patient } from "@/lib/types";
import { PatientBanner, SubmissionView } from "@/components/Views";
import { StatusBadge } from "@/components/StatusBadge";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, clinic } = await requireUser(["doctor", "nurse"]);
  const store = getStore();
  const patient = await store.get<Patient>("patients", (await params).id);
  if (!patient || patient.clinicId !== user.clinicId) notFound();
  const frontDesk = canDoFrontDesk(user, clinic);
  const [form, appts] = await Promise.all([getRegistrationForm(), store.list<Appointment>("appointments")]);
  const history = appts.filter((a) => a.patientId === patient.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  return (
    <>
      <div className="page-head">
        <h1>Patient</h1>
        {frontDesk && (
          <div className="row-actions">
            <Link href={`/patients/${patient.id}/edit`} className="btn">Edit</Link>
            <Link href={`/appointments/new?patientId=${patient.id}`} className="btn btn-primary">Book appointment</Link>
          </div>
        )}
      </div>
      <PatientBanner patient={patient} />
      <div className="grid-2">
        <section className="card">
          <h2>Registration details</h2>
          <SubmissionView fields={form.fields} submission={{ data: patient.data, by: patient.createdBy, byName: "registration", at: patient.createdAt }} />
        </section>
        <section className="card flush">
          <h2 className="pad">Visit history</h2>
          <table className="table">
            <thead><tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {history.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{a.date} {a.time}</td>
                  <td>Dr. {a.doctorName}</td>
                  <td>{findValue(a, "diagnosis")}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{a.status === "completed" ? <Link href={`/reports/${a.id}`} className="btn btn-sm">Report</Link> : <Link href={`/appointments/${a.id}`} className="btn btn-sm">Open</Link>}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={5} className="muted">No visits yet.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
