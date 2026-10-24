import Link from "next/link";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Appointment, AppointmentStatus, Clinic, Patient, User } from "@/lib/types";
import { today } from "@/lib/util";
import { findValue } from "@/lib/forms";
import { StatusBadge } from "@/components/StatusBadge";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: "Waiting for nurse",
  vitals_done: "Ready for doctor",
  in_consultation: "In consultation",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ clinic?: string }> }) {
  await requireUser(["admin"]);
  const { clinic: clinicFilter = "" } = await searchParams;
  const store = getStore();
  const [clinics, users, allPatients, allAppts] = await Promise.all([
    store.list<Clinic>("clinics"),
    store.list<User>("users"),
    store.list<Patient>("patients"),
    store.list<Appointment>("appointments"),
  ]);
  const inClinic = <T extends { clinicId: string | null }>(x: T) => !clinicFilter || x.clinicId === clinicFilter;
  const patients = allPatients.filter(inClinic);
  const appts = allAppts.filter(inClinic);
  const t = today();
  const todays = appts.filter((a) => a.date === t);
  const count = (s: AppointmentStatus) => todays.filter((a) => a.status === s).length;

  const days = Array.from({ length: 14 }, (_, i) => today(i - 13));
  const perDay = days.map((d) => ({ d, n: appts.filter((a) => a.date === d && a.status !== "cancelled").length }));
  const maxDay = Math.max(1, ...perDay.map((x) => x.n));

  const doctors = users.filter((u) => u.role === "doctor" && u.active && inClinic(u));
  const nurses = users.filter((u) => u.role === "nurse" && u.active && inClinic(u));
  const perDoctor = doctors.map((d) => {
    const mine = todays.filter((a) => a.doctorId === d.id);
    return {
      d,
      total: mine.filter((a) => a.status !== "cancelled").length,
      waiting: mine.filter((a) => a.status === "booked" || a.status === "vitals_done").length,
      done: mine.filter((a) => a.status === "completed").length,
    };
  });

  const since = today(-30);
  const dx = new Map<string, number>();
  for (const a of appts) {
    const d = findValue(a, "diagnosis").trim();
    if (a.status === "completed" && a.date >= since && d) dx.set(d.toLowerCase(), (dx.get(d.toLowerCase()) ?? 0) + 1);
  }
  const topDx = [...dx.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxDx = Math.max(1, ...topDx.map((x) => x[1]));

  const stats = [
    { label: "Total patients", value: patients.length, sub: `${patients.filter((p) => p.createdAt.slice(0, 10) === t).length} registered today` },
    { label: "Appointments today", value: todays.filter((a) => a.status !== "cancelled").length, sub: `${count("cancelled")} cancelled` },
    { label: "Waiting now", value: count("booked") + count("vitals_done"), sub: `${count("in_consultation")} in consultation` },
    { label: "Completed today", value: count("completed"), sub: `${appts.filter((a) => a.status === "completed").length} all time` },
    { label: "Active doctors", value: doctors.length, sub: `${nurses.length} nurses` },
    { label: "Clinics", value: clinicFilter ? 1 : clinics.length, sub: `${clinics.filter((c) => !c.nurseEnabled).length} doctor-only` },
  ];

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <form className="inline-filters">
          <select name="clinic" defaultValue={clinicFilter} aria-label="Clinic">
            <option value="">All clinics</option>
            {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-sm">Apply</button>
        </form>
      </div>

      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>Appointments — last 14 days</h2>
          <div className="bars" role="img" aria-label="Appointments per day for the last 14 days">
            {perDay.map(({ d, n }) => (
              <div key={d} className="bar-col" title={`${d}: ${n} appointment${n === 1 ? "" : "s"}`}>
                <span className="bar-val">{n || ""}</span>
                <div className="bar" style={{ height: `${(n / maxDay) * 100}%` }} />
                <span className="bar-label">{d.slice(8)}</span>
              </div>
            ))}
          </div>
          <details className="small">
            <summary>Table view</summary>
            <table className="table"><tbody>{perDay.map(({ d, n }) => <tr key={d}><td>{d}</td><td>{n}</td></tr>)}</tbody></table>
          </details>
        </section>

        <section className="card">
          <h2>Today by status</h2>
          <table className="table">
            <tbody>
              {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => (
                <tr key={s}>
                  <td><StatusBadge status={s} /></td>
                  <td>{STATUS_LABEL[s]}</td>
                  <td className="num">{count(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Doctor workload today</h2>
          {perDoctor.length === 0 ? <p className="muted">No active doctors. <Link href="/admin/users/new">Add one</Link>.</p> : (
            <table className="table">
              <thead><tr><th>Doctor</th><th className="num">Booked</th><th className="num">Waiting</th><th className="num">Completed</th></tr></thead>
              <tbody>
                {perDoctor.map(({ d, total, waiting, done }) => (
                  <tr key={d.id}><td>Dr. {d.name}<div className="muted small">{d.specialization}</div></td><td className="num">{total}</td><td className="num">{waiting}</td><td className="num">{done}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>Top diagnoses — last 30 days</h2>
          {topDx.length === 0 ? <p className="muted">No completed cases yet.</p> : (
            <div className="hbars">
              {topDx.map(([name, n]) => (
                <div key={name} className="hbar-row" title={`${name}: ${n}`}>
                  <span className="hbar-label">{name}</span>
                  <span className="hbar-track"><span className="hbar" style={{ width: `${(n / maxDx) * 100}%` }} /></span>
                  <span className="num">{n}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
