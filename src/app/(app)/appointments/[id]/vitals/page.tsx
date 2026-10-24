import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canConsult, canDoFrontDesk } from "@/lib/permissions";
import { nurseGroupsFor, submissionsOf } from "@/lib/forms";
import { saveVitals } from "@/app/actions/clinical";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { GroupSections } from "@/components/GroupSections";
import { PatientBanner } from "@/components/Views";
import type { Appointment, Patient } from "@/lib/types";

/** Nurse case sheet: the form groups mapped to nurses (doctors fill it in nurse-less clinics). */
export default async function NurseCaseSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, clinic } = await requireUser(["doctor", "nurse"]);
  const store = getStore();
  const appt = await store.get<Appointment>("appointments", (await params).id);
  if (!appt) notFound();
  const allowed = (canDoFrontDesk(user, clinic) && appt.clinicId === user.clinicId) || canConsult(user, appt);
  if (!allowed) notFound();
  if (appt.status === "completed" || appt.status === "cancelled") redirect(`/appointments/${appt.id}`);
  const [patient, groups] = await Promise.all([store.get<Patient>("patients", appt.patientId), nurseGroupsFor(appt, user)]);
  return (
    <>
      <h1>Nurse case sheet <span className="muted h-sub">· token #{appt.tokenNo} · Dr. {appt.doctorName}</span></h1>
      {patient && <PatientBanner patient={patient} />}
      {groups.length === 0 ? (
        <div className="card">
          <p>No forms are mapped to nurses{clinic ? ` in ${clinic.name}` : ""}.</p>
          <p className="muted">Ask the admin to create a form group in Admin → Form Builder → Form groups and map it to nurses.</p>
          <Link href={`/appointments/${appt.id}`} className="btn">Back</Link>
        </div>
      ) : (
        <ActionForm action={saveVitals}>
          <input type="hidden" name="id" value={appt.id} />
          <GroupSections groups={groups} submissions={submissionsOf(appt)} />
          <div className="form-actions sticky-actions">
            <Link href={`/appointments/${appt.id}`} className="btn">Cancel</Link>
            <SubmitButton>{user.role === "doctor" ? "Save & go to case sheet" : "Save nurse case sheet"}</SubmitButton>
          </div>
        </ActionForm>
      )}
    </>
  );
}
