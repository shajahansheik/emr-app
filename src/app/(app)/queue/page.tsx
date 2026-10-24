import Link from "next/link";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canDoFrontDesk } from "@/lib/permissions";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { today } from "@/lib/util";
import { StatusBadge } from "@/components/StatusBadge";

const ORDER: AppointmentStatus[] = ["in_consultation", "vitals_done", "booked", "completed", "cancelled"];

export default async function QueuePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { user, clinic } = await requireUser(["doctor", "nurse"]);
  const { date = today() } = await searchParams;
  const frontDesk = canDoFrontDesk(user, clinic);
  const all = await getStore().list<Appointment>("appointments");
  const rows = all
    .filter((a) => a.date === date && (user.role === "doctor" ? a.doctorId === user.id : a.clinicId === user.clinicId))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.time.localeCompare(b.time));
  const waiting = rows.filter((a) => a.status === "booked" || a.status === "vitals_done").length;
  const done = rows.filter((a) => a.status === "completed").length;

  return (
    <>
      <div className="page-head">
        <h1>{user.role === "doctor" ? "My appointments" : "Today's queue"}</h1>
        <div className="row-actions">
          <form className="inline-filters">
            <input type="date" name="date" defaultValue={date} aria-label="Date" />
            <button className="btn btn-sm">Go</button>
          </form>
          {frontDesk && <Link href="/patients/new" className="btn">+ Register patient</Link>}
          {frontDesk && <Link href="/appointments/new" className="btn btn-primary">+ Book appointment</Link>}
        </div>
      </div>
      <div className="stats stats-sm">
        <div className="stat"><div className="stat-label">Appointments</div><div className="stat-value">{rows.filter((a) => a.status !== "cancelled").length}</div></div>
        <div className="stat"><div className="stat-label">Waiting</div><div className="stat-value">{waiting}</div></div>
        <div className="stat"><div className="stat-label">Completed</div><div className="stat-value">{done}</div></div>
      </div>
      <div className="card flush">
        <table className="table">
          <thead><tr><th>Token</th><th>Time</th><th>Patient</th>{user.role === "nurse" && <th>Doctor</th>}<th>Reason</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="token">#{a.tokenNo}</td>
                <td>{a.time}</td>
                <td><Link href={`/patients/${a.patientId}`}>{a.patientName}</Link></td>
                {user.role === "nurse" && <td>Dr. {a.doctorName}</td>}
                <td>{a.reason}</td>
                <td><StatusBadge status={a.status} /></td>
                <td className="row-actions">
                  {user.role === "doctor" && a.status !== "cancelled" && (
                    <Link href={a.status === "completed" ? `/reports/${a.id}` : `/consult/${a.id}`} className={a.status === "completed" ? "btn btn-sm" : "btn btn-sm btn-primary"}>
                      {a.status === "completed" ? "Report" : a.status === "in_consultation" ? "Continue" : "Start consultation"}
                    </Link>
                  )}
                  {user.role === "nurse" && a.status === "booked" && <Link href={`/appointments/${a.id}/vitals`} className="btn btn-sm btn-primary">Nurse case sheet</Link>}
                  <Link href={`/appointments/${a.id}`} className="btn btn-sm">Open</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="muted">No appointments for {date}.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
