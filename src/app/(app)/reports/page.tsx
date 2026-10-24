import Link from "next/link";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Appointment, User } from "@/lib/types";
import { today } from "@/lib/util";
import { findValue } from "@/lib/forms";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; doctor?: string }> }) {
  const { user } = await requireUser(["doctor", "admin"]);
  const { from = today(-30), to = today(), doctor = "" } = await searchParams;
  const store = getStore();
  const [appts, users] = await Promise.all([store.list<Appointment>("appointments"), store.list<User>("users")]);
  const doctorId = user.role === "doctor" ? user.id : doctor;
  const inRange = appts.filter((a) => a.date >= from && a.date <= to && (!doctorId || a.doctorId === doctorId));
  const completed = inRange.filter((a) => a.status === "completed").sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const uniquePatients = new Set(completed.map((a) => a.patientId)).size;
  const followUps = completed.filter((a) => findValue(a, "followUp")).length;
  const dx = new Map<string, number>();
  for (const a of completed) {
    const d = findValue(a, "diagnosis").trim();
    if (d) dx.set(d, (dx.get(d) ?? 0) + 1);
  }
  const topDx = [...dx.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const qs = new URLSearchParams({ from, to }).toString();

  return (
    <>
      <div className="page-head">
        <h1>Reports</h1>
        <a href={`/api/reports/export?${qs}`} className="btn">⬇ Export CSV</a>
      </div>
      <form className="filters card">
        <label>From <input type="date" name="from" defaultValue={from} /></label>
        <label>To <input type="date" name="to" defaultValue={to} /></label>
        {user.role === "admin" && (
          <label>Doctor
            <select name="doctor" defaultValue={doctor}>
              <option value="">All doctors</option>
              {users.filter((u) => u.role === "doctor").map((d) => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
            </select>
          </label>
        )}
        <button className="btn btn-sm">Apply</button>
      </form>
      <div className="stats">
        <div className="stat"><div className="stat-label">Completed consultations</div><div className="stat-value">{completed.length}</div></div>
        <div className="stat"><div className="stat-label">Unique patients</div><div className="stat-value">{uniquePatients}</div></div>
        <div className="stat"><div className="stat-label">Cancelled</div><div className="stat-value">{inRange.filter((a) => a.status === "cancelled").length}</div></div>
        <div className="stat"><div className="stat-label">Follow-ups advised</div><div className="stat-value">{followUps}</div></div>
      </div>
      <div className="grid-2 grid-wide-left">
        <section className="card flush">
          <h2 className="pad">Consultations</h2>
          <table className="table">
            <thead><tr><th>Date</th><th>Patient</th>{user.role === "admin" && <th>Doctor</th>}<th>Diagnosis</th><th></th></tr></thead>
            <tbody>
              {completed.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{a.date} {a.time}</td>
                  <td>{a.patientName}</td>
                  {user.role === "admin" && <td>Dr. {a.doctorName}</td>}
                  <td>{findValue(a, "diagnosis")}</td>
                  <td><Link href={`/reports/${a.id}`} className="btn btn-sm">Report</Link></td>
                </tr>
              ))}
              {completed.length === 0 && <tr><td colSpan={5} className="muted">No completed consultations in this period.</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h2>Diagnoses</h2>
          {topDx.length === 0 ? <p className="muted">—</p> : (
            <table className="table"><tbody>{topDx.map(([d, n]) => <tr key={d}><td>{d}</td><td className="num">{n}</td></tr>)}</tbody></table>
          )}
        </section>
      </div>
    </>
  );
}
