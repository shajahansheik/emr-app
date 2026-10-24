import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canConsult, canDoFrontDesk, canViewAppointment } from "@/lib/permissions";
import { filledForms } from "@/lib/forms";
import { assignDoctor, cancelAppointment } from "@/app/actions/clinical";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PatientBanner, SubmissionCards } from "@/components/Views";
import { StatusBadge } from "@/components/StatusBadge";
import type { Appointment, Patient, User } from "@/lib/types";

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, clinic } = await requireUser();
  const store = getStore();
  const appt = await store.get<Appointment>("appointments", (await params).id);
  if (!appt || !canViewAppointment(user, clinic, appt)) notFound();
  const [patient, recorded, users] = await Promise.all([
    store.get<Patient>("patients", appt.patientId),
    filledForms(appt),
    store.list<User>("users"),
  ]);
  const open = appt.status !== "completed" && appt.status !== "cancelled";
  const frontDesk = canDoFrontDesk(user, clinic) && appt.clinicId === user.clinicId;
  const doctors = users.filter((u) => u.role === "doctor" && u.active && u.clinicId === appt.clinicId);

  return (
    <>
      <div className="page-head">
        <h1>Appointment #{appt.tokenNo} <StatusBadge status={appt.status} /></h1>
        <div className="row-actions">
          {open && (frontDesk || canConsult(user, appt)) && (
            <Link href={`/appointments/${appt.id}/vitals`} className="btn">Nurse case sheet</Link>
          )}
          {open && canConsult(user, appt) && <Link href={`/consult/${appt.id}`} className="btn btn-primary">Open case sheet</Link>}
          {appt.status === "completed" && <Link href={`/reports/${appt.id}`} className="btn btn-primary">View report</Link>}
        </div>
      </div>
      {patient && <PatientBanner patient={patient} />}
      <div className="grid-2">
        <section className="card">
          <h2>Details</h2>
          <dl className="kv">
            <div className="kv-row"><dt>Date & time</dt><dd>{appt.date} {appt.time}</dd></div>
            <div className="kv-row"><dt>Doctor</dt><dd>Dr. {appt.doctorName}</dd></div>
            <div className="kv-row"><dt>Reason</dt><dd>{appt.reason || "—"}</dd></div>
          </dl>
          {open && frontDesk && (
            <>
              <h3>Assign / reassign doctor</h3>
              <ActionForm action={assignDoctor} className="inline-filters">
                <input type="hidden" name="id" value={appt.id} />
                <select name="doctorId" defaultValue={appt.doctorId} aria-label="Doctor">
                  {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                </select>
                <SubmitButton className="btn btn-sm btn-primary">Assign</SubmitButton>
              </ActionForm>
            </>
          )}
          {open && user.role !== "admin" && (frontDesk || canConsult(user, appt)) && (
            <form action={cancelAppointment} className="mt">
              <input type="hidden" name="id" value={appt.id} />
              <ConfirmButton message="Cancel this appointment?">Cancel appointment</ConfirmButton>
            </form>
          )}
        </section>
        <div>
          <SubmissionCards items={recorded} empty="No case sheet forms filled yet." />
        </div>
      </div>
    </>
  );
}
