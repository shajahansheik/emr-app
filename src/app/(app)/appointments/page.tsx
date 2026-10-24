import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canDoFrontDesk } from "@/lib/permissions";
import type { Appointment, User } from "@/lib/types";
import { today } from "@/lib/util";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; status?: string; doctor?: string }> }) {
  const { user, clinic } = await requireUser(["doctor", "nurse"]);
  if (!canDoFrontDesk(user, clinic)) redirect("/queue");
  const { from = today(), to = today(7), status = "", doctor = "" } = await searchParams;
  const store = getStore();
  const [appts, users] = await Promise.all([store.list<Appointment>("appointments"), store.list<User>("users")]);
  const doctors = users.filter((u) => u.role === "doctor" && u.clinicId === user.clinicId);
  const rows = appts
    .filter((a) => a.clinicId === user.clinicId && a.date >= from && a.date <= to)
    .filter((a) => (!status || a.status === status) && (!doctor || a.doctorId === doctor))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <>
      <div className="page-head">
        <h1>Appointments</h1>
        <Link href="/appointments/new" className="btn btn-primary">+ Book appointment</Link>
      </div>
      <form className="filters card">
        <label>From <input type="date" name="from" defaultValue={from} /></label>
        <label>To <input type="date" name="to" defaultValue={to} /></label>
        <label>Status
          <select name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="booked">Booked</option>
            <option value="vitals_done">Nurse done</option>
            <option value="in_consultation">In consultation</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label>Doctor
          <select name="doctor" defaultValue={doctor}>
            <option value="">All</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
          </select>
        </label>
        <button className="btn btn-sm">Filter</button>
      </form>
      <div className="card flush">
        <table className="table">
          <thead><tr><th>Date</th><th>Time</th><th>Token</th><th>Patient</th><th>Doctor</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.date}</td><td>{a.time}</td><td className="token">#{a.tokenNo}</td>
                <td>{a.patientName}</td><td>Dr. {a.doctorName}</td>
                <td><StatusBadge status={a.status} /></td>
                <td><Link href={`/appointments/${a.id}`} className="btn btn-sm">Open</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="muted">No appointments match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
