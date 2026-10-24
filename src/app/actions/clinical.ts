"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { canConsult, canDoFrontDesk, canViewAppointment } from "@/lib/permissions";
import { doctorGroupsFor, getRegistrationForm, nurseGroupsFor, readFormValues, readGroupValues, submissionsOf } from "@/lib/forms";
import type { Appointment, FormSubmission, Patient, User } from "@/lib/types";
import { newId, nowIso, str } from "@/lib/util";
import type { ActionState } from "./state";

const FORBIDDEN: ActionState = { error: "You are not allowed to do this" };

export async function savePatient(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, clinic } = await requireUser();
  if (!canDoFrontDesk(user, clinic) || !user.clinicId) return FORBIDDEN;
  const store = getStore();
  const form = await getRegistrationForm();
  const { values, errors } = readFormValues(form.fields, fd);
  if (errors.length) return { error: errors.join(". ") };

  const core = {
    fullName: String(values.fullName ?? ""),
    phone: String(values.phone ?? ""),
    gender: String(values.gender ?? ""),
    dob: String(values.dob ?? ""),
  };
  if (!/^[0-9+\-\s]{7,15}$/.test(core.phone)) return { error: "Enter a valid mobile number" };

  const id = str(fd.get("id"));
  let patientId = id;
  if (id) {
    const existing = await store.get<Patient>("patients", id);
    if (!existing || existing.clinicId !== user.clinicId) return FORBIDDEN;
    await store.update<Patient>("patients", id, { ...core, data: values });
    await audit(user, "update", "patient", id, `Updated patient ${existing.mrn} ${core.fullName}`);
  } else {
    const patients = await store.list<Patient>("patients");
    const nextNo = patients.reduce((m, p) => Math.max(m, parseInt(p.mrn.replace(/\D/g, "")) || 0), 0) + 1;
    const t = nowIso();
    const p: Patient = {
      id: newId(),
      createdAt: t,
      updatedAt: t,
      mrn: `MRN${String(nextNo).padStart(6, "0")}`,
      clinicId: user.clinicId,
      ...core,
      data: values,
      createdBy: user.id,
    };
    await store.insert("patients", p);
    await audit(user, "create", "patient", p.id, `Registered patient ${p.mrn} ${p.fullName}`);
    patientId = p.id;
  }
  revalidatePath("/patients");
  if (fd.get("next") === "book") redirect(`/appointments/new?patientId=${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function createAppointment(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, clinic } = await requireUser();
  if (!canDoFrontDesk(user, clinic)) return FORBIDDEN;
  const store = getStore();
  const patient = await store.get<Patient>("patients", str(fd.get("patientId")));
  if (!patient || patient.clinicId !== user.clinicId) return { error: "Select a patient" };
  const doctorId = str(fd.get("doctorId")) || (user.role === "doctor" ? user.id : "");
  const doctor = await store.get<User>("users", doctorId);
  if (!doctor || doctor.role !== "doctor" || !doctor.active || doctor.clinicId !== user.clinicId) {
    return { error: "Select a doctor from this clinic" };
  }
  const date = str(fd.get("date"));
  const time = str(fd.get("time"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Date and time are required" };

  const appts = await store.list<Appointment>("appointments");
  const tokenNo = appts.filter((a) => a.doctorId === doctor.id && a.date === date).length + 1;
  const t = nowIso();
  const appt: Appointment = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    clinicId: patient.clinicId,
    patientId: patient.id,
    patientName: patient.fullName,
    doctorId: doctor.id,
    doctorName: doctor.name,
    date,
    time,
    reason: str(fd.get("reason")),
    status: "booked",
    tokenNo,
    createdBy: user.id,
  };
  await store.insert("appointments", appt);
  await audit(user, "create", "appointment", appt.id, `Booked ${patient.fullName} with Dr. ${doctor.name} on ${date} ${time} (token ${tokenNo})`);
  revalidatePath("/queue");
  redirect(fd.get("next") === "vitals" ? `/appointments/${appt.id}/vitals` : `/appointments/${appt.id}`);
}

export async function assignDoctor(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, clinic } = await requireUser();
  if (!canDoFrontDesk(user, clinic)) return FORBIDDEN;
  const store = getStore();
  const appt = await store.get<Appointment>("appointments", str(fd.get("id")));
  if (!appt || appt.clinicId !== user.clinicId) return FORBIDDEN;
  if (appt.status === "completed" || appt.status === "cancelled") return { error: "This appointment is closed" };
  const doctor = await store.get<User>("users", str(fd.get("doctorId")));
  if (!doctor || doctor.role !== "doctor" || !doctor.active || doctor.clinicId !== appt.clinicId) return { error: "Select a doctor" };
  if (doctor.id === appt.doctorId) return { message: "Already assigned to this doctor" };
  await store.update<Appointment>("appointments", appt.id, { doctorId: doctor.id, doctorName: doctor.name });
  await audit(user, "assign", "appointment", appt.id, `Assigned ${appt.patientName} from Dr. ${appt.doctorName} to Dr. ${doctor.name}`);
  revalidatePath(`/appointments/${appt.id}`);
  return { message: `Assigned to Dr. ${doctor.name}` };
}

export async function cancelAppointment(fd: FormData) {
  const { user, clinic } = await requireUser();
  const store = getStore();
  const appt = await store.get<Appointment>("appointments", str(fd.get("id")));
  if (!appt || !canViewAppointment(user, clinic, appt) || user.role === "admin") redirect("/queue");
  if (appt.status !== "completed") {
    await store.update<Appointment>("appointments", appt.id, { status: "cancelled" });
    await audit(user, "cancel", "appointment", appt.id, `Cancelled appointment of ${appt.patientName}`);
  }
  redirect(`/appointments/${appt.id}`);
}

function stamp(data: FormSubmission["data"], user: { id: string; name: string }): FormSubmission {
  return { data, by: user.id, byName: user.name, at: nowIso() };
}

/** Merge newly saved form values into the appointment's submissions (legacy fields are folded in). */
function mergeForms(appt: Appointment, values: Record<string, FormSubmission["data"]>, user: { id: string; name: string }) {
  const forms = submissionsOf(appt);
  for (const [key, data] of Object.entries(values)) forms[key] = stamp(data, user);
  return { forms, vitals: undefined, caseSheet: undefined, extraForms: undefined };
}

/** Save the nurse case sheet (the form groups assigned to nurses). */
export async function saveVitals(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, clinic } = await requireUser();
  const store = getStore();
  const appt = await store.get<Appointment>("appointments", str(fd.get("id")));
  if (!appt) return FORBIDDEN;
  const allowed = (canDoFrontDesk(user, clinic) && appt.clinicId === user.clinicId) || canConsult(user, appt);
  if (!allowed) return FORBIDDEN;
  if (appt.status === "completed" || appt.status === "cancelled") return { error: "This appointment is closed" };
  const groups = await nurseGroupsFor(appt, user);
  if (!groups.length) return { error: "No nurse forms are assigned. Ask the admin to map a form group to nurses." };
  const { values, errors } = readGroupValues(groups, fd);
  if (errors.length) return { error: errors.join(". ") };
  const first = !appt.forms && !appt.vitals;
  await store.update<Appointment>("appointments", appt.id, {
    ...mergeForms(appt, values, user),
    status: appt.status === "booked" ? "vitals_done" : appt.status,
  });
  await audit(user, first ? "create" : "update", "nurse_case_sheet", appt.id,
    `Nurse case sheet (${groups.map((g) => g.group.name).join(", ")}) saved for ${appt.patientName}`);
  revalidatePath("/queue");
  redirect(user.role === "doctor" ? `/consult/${appt.id}` : `/appointments/${appt.id}`);
}

/** Save the doctor's case sheet (form groups assigned to the doctor) as a draft, or complete the case. */
export async function saveCaseSheet(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser(["doctor"]);
  const store = getStore();
  const appt = await store.get<Appointment>("appointments", str(fd.get("id")));
  if (!appt || !canConsult(user, appt)) return FORBIDDEN;
  if (appt.status === "completed" || appt.status === "cancelled") return { error: "This case is already closed" };
  const complete = fd.get("intent") === "complete";

  const groups = await doctorGroupsFor(appt);
  const { values, errors } = readGroupValues(groups, fd);
  if (complete && errors.length) return { error: errors.join(". ") };

  await store.update<Appointment>("appointments", appt.id, {
    ...mergeForms(appt, values, user),
    status: complete ? "completed" : "in_consultation",
    ...(complete ? { completedAt: nowIso() } : {}),
  });
  await audit(user, complete ? "complete" : "update", "case_sheet", appt.id,
    `${complete ? "Completed case" : "Saved case sheet draft"} for ${appt.patientName}`);
  revalidatePath("/queue");
  if (complete) redirect(`/reports/${appt.id}`);
  return { message: "Draft saved" };
}
