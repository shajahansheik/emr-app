import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canConsult } from "@/lib/permissions";
import { doctorGroupsFor, filledForms, findValue, submissionsOf } from "@/lib/forms";
import { saveCaseSheet } from "@/app/actions/clinical";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { GroupSections } from "@/components/GroupSections";
import { PatientBanner, SubmissionView } from "@/components/Views";
import { StatusBadge } from "@/components/StatusBadge";
import type { Appointment, Patient } from "@/lib/types";

/** Doctor case sheet: the form groups mapped to this doctor, next to what the nurse recorded. */
export default async function ConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(["doctor"]);
  const store = getStore();
  const appt = await store.get<Appointment>("appointments", (await params).id);
  if (!appt || !canConsult(user, appt)) notFound();
  if (appt.status === "completed") redirect(`/reports/${appt.id}`);
  if (appt.status === "cancelled") redirect(`/appointments/${appt.id}`);
  const groups = await doctorGroupsFor(appt);
  const editable = new Set(groups.flatMap((g) => g.forms.map((f) => f.key)));
  const [patient, recorded, appts] = await Promise.all([
    store.get<Patient>("patients", appt.patientId),
    filledForms(appt, { exclude: editable }),
    store.list<Appointment>("appointments"),
  ]);
  const previous = appts
    .filter((a) => a.patientId === appt.patientId && a.status === "completed" && a.id !== appt.id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 5);

  return (
    <>
      <div className="page-head">
        <h1>Consultation <span className="muted h-sub">· token #{appt.tokenNo} · {appt.date} {appt.time}</span> <StatusBadge status={appt.status} /></h1>
        <Link href={`/appointments/${appt.id}/vitals`} className="btn">Nurse case sheet</Link>
      </div>
      {patient && <PatientBanner patient={patient} />}
      <div className="consult">
        <aside className="consult-side">
          <section className="card">
            <h2>Recorded before consultation</h2>
            {appt.reason && <p><strong>Reason:</strong> {appt.reason}</p>}
            {recorded.length === 0 && <p className="muted">Nothing recorded yet.</p>}
            {recorded.map(({ form, submission }) => (
              <div key={form.key} className="side-form">
                <h3>{form.name}</h3>
                <SubmissionView fields={form.fields} submission={submission} />
              </div>
            ))}
          </section>
          <section className="card">
            <h2>Previous visits</h2>
            {previous.length === 0 ? <p className="muted">First visit.</p> : (
              <ul className="history">
                {previous.map((a) => (
                  <li key={a.id}>
                    <Link href={`/reports/${a.id}`}>{a.date}</Link> — {findValue(a, "diagnosis")}
                    <div className="muted small">Dr. {a.doctorName}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
        <div className="consult-main">
          {groups.length === 0 ? (
            <div className="card">
              <p>No case sheet forms are mapped to you.</p>
              <p className="muted">Ask the admin to map a form group to doctors (or to you) in Admin → Form Builder → Form groups.</p>
            </div>
          ) : (
            <ActionForm action={saveCaseSheet}>
              <input type="hidden" name="id" value={appt.id} />
              <GroupSections groups={groups} submissions={submissionsOf(appt)} />
              <div className="form-actions sticky-actions">
                <SubmitButton className="btn" name="intent" value="draft" noValidate>Save draft</SubmitButton>
                <SubmitButton name="intent" value="complete" confirm="Complete this case? The case sheet will be locked and the report generated.">
                  Complete case & generate report
                </SubmitButton>
              </div>
            </ActionForm>
          )}
        </div>
      </div>
    </>
  );
}
