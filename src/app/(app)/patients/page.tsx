import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canDoFrontDesk } from "@/lib/permissions";
import type { Patient } from "@/lib/types";
import { ageFrom } from "@/lib/util";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { user, clinic } = await requireUser(["doctor", "nurse"]);
  if (!canDoFrontDesk(user, clinic)) redirect("/queue");
  const { q = "" } = await searchParams;
  const needle = q.toLowerCase().trim();
  const rows = (await getStore().list<Patient>("patients"))
    .filter((p) => p.clinicId === user.clinicId)
    .filter((p) => !needle || `${p.fullName} ${p.mrn} ${p.phone}`.toLowerCase().includes(needle))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200);
  return (
    <>
      <div className="page-head">
        <h1>Patients</h1>
        <div className="row-actions">
          <form className="inline-filters">
            <input name="q" defaultValue={q} placeholder="Name, MRN or phone" aria-label="Search patients" autoFocus />
            <button className="btn btn-sm">Search</button>
          </form>
          <Link href="/patients/new" className="btn btn-primary">+ Register patient</Link>
        </div>
      </div>
      <div className="card flush">
        <table className="table">
          <thead><tr><th>MRN</th><th>Name</th><th>Age / Sex</th><th>Phone</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.mrn}</td>
                <td><Link href={`/patients/${p.id}`}>{p.fullName}</Link></td>
                <td>{[ageFrom(p.dob), p.gender].filter(Boolean).join(" / ")}</td>
                <td>{p.phone}</td>
                <td className="row-actions"><Link href={`/appointments/new?patientId=${p.id}`} className="btn btn-sm btn-primary">Book</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="muted">No patients found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
