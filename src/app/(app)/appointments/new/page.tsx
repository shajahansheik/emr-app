import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canDoFrontDesk } from "@/lib/permissions";
import { createAppointment } from "@/app/actions/clinical";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PatientBanner } from "@/components/Views";
import type { Patient, User } from "@/lib/types";
import { today } from "@/lib/util";

export default async function NewAppointment({ searchParams }: { searchParams: Promise<{ patientId?: string; q?: string }> }) {
  const { user, clinic } = await requireUser(["doctor", "nurse"]);
  if (!canDoFrontDesk(user, clinic)) redirect("/queue");
  const { patientId, q = "" } = await searchParams;
  const store = getStore();
  const patient = patientId ? await store.get<Patient>("patients", patientId) : null;

  if (!patient || patient.clinicId !== user.clinicId) {
    const needle = q.toLowerCase().trim();
    const matches = needle
      ? (await store.list<Patient>("patients")).filter((p) => p.clinicId === user.clinicId && `${p.fullName} ${p.mrn} ${p.phone}`.toLowerCase().includes(needle)).slice(0, 20)
      : [];
    return (
      <>
        <h1>Book appointment</h1>
        <div className="card narrow">
          <h2>1. Find the patient</h2>
          <form className="inline-filters">
            <input name="q" defaultValue={q} placeholder="Name, MRN or phone" autoFocus aria-label="Search patient" />
            <button className="btn">Search</button>
          </form>
          {needle && (
            <ul className="pick-list">
              {matches.map((p) => (
                <li key={p.id}>
                  <Link href={`/appointments/new?patientId=${p.id}`}><strong>{p.fullName}</strong> <span className="muted">{p.mrn} · {p.phone}</span></Link>
                </li>
              ))}
              {matches.length === 0 && <li className="muted">No patient found.</li>}
            </ul>
          )}
          <p>New patient? <Link href="/patients/new">Register first</Link>.</p>
        </div>
      </>
    );
  }

  const doctors = (await store.list<User>("users")).filter((u) => u.role === "doctor" && u.active && u.clinicId === user.clinicId);
  const slot = new Date(Math.ceil(Date.now() / 900_000) * 900_000); // next 15-minute slot
  const time = `${String(slot.getHours()).padStart(2, "0")}:${String(slot.getMinutes()).padStart(2, "0")}`;
  return (
    <>
      <h1>Book appointment</h1>
      <PatientBanner patient={patient} />
      <ActionForm action={createAppointment} className="card narrow">
        <input type="hidden" name="patientId" value={patient.id} />
        <div className="form-grid">
          <div className="field field-full">
            <label htmlFor="doctorId">Assign to doctor <span className="req">*</span></label>
            <select id="doctorId" name="doctorId" defaultValue={user.role === "doctor" ? user.id : ""} required>
              <option value="">— Select doctor —</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name}{d.specialization ? ` — ${d.specialization}` : ""}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" name="date" type="date" defaultValue={today()} min={today()} required />
          </div>
          <div className="field">
            <label htmlFor="time">Time</label>
            <input id="time" name="time" type="time" defaultValue={time} required />
          </div>
          <div className="field field-full">
            <label htmlFor="reason">Reason for visit</label>
            <input id="reason" name="reason" placeholder="Fever since 2 days" />
          </div>
        </div>
        <div className="form-actions">
          <Link href="/appointments/new" className="btn">Change patient</Link>
          <SubmitButton className="btn" name="next" value="view">Book</SubmitButton>
          <SubmitButton name="next" value="vitals">Book & capture vitals</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
