import type { Clinic, SessionUser, Appointment } from "./types";

/**
 * Front-desk work (patient registration, booking, vitals) belongs to nurses.
 * In clinics configured without a nurse, doctors do it themselves.
 */
export function canDoFrontDesk(user: SessionUser, clinic: Clinic | null) {
  if (user.role === "nurse") return true;
  if (user.role === "doctor") return clinic ? !clinic.nurseEnabled : true;
  return false;
}

export function canConsult(user: SessionUser, appt: Appointment) {
  return user.role === "doctor" && appt.doctorId === user.id;
}

/** Can the user see this appointment at all? */
export function canViewAppointment(user: SessionUser, clinic: Clinic | null, appt: Appointment) {
  if (user.role === "admin") return true;
  if (appt.doctorId === user.id) return true;
  return canDoFrontDesk(user, clinic) && appt.clinicId === user.clinicId;
}
