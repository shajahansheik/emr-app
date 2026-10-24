import Link from "next/link";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { deleteClinic } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { Clinic, User } from "@/lib/types";
import { Flash } from "../Flash";

export default async function ClinicsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser(["admin"]);
  const { error } = await searchParams;
  const store = getStore();
  const [clinics, users] = await Promise.all([store.list<Clinic>("clinics"), store.list<User>("users")]);
  return (
    <>
      <div className="page-head">
        <h1>Clinics</h1>
        <Link href="/admin/clinics/new" className="btn btn-primary">+ Add clinic</Link>
      </div>
      <Flash error={error} />
      <p className="muted">
        <strong>Workflow mode:</strong> “With nurse” clinics have nurses doing registration, booking and vitals.
        In “Doctor only” clinics there is no nurse or front-desk computer, so doctors register patients, book and complete appointments themselves.
      </p>
      <div className="card flush">
        <table className="table">
          <thead><tr><th>Clinic</th><th>Workflow mode</th><th className="num">Doctors</th><th className="num">Nurses</th><th></th></tr></thead>
          <tbody>
            {clinics.map((c) => (
              <tr key={c.id}>
                <td>{c.name}<div className="muted small">{[c.address, c.phone].filter(Boolean).join(" · ")}</div></td>
                <td>{c.nurseEnabled ? <span className="status status-vitals_done">With nurse</span> : <span className="status status-in_consultation">Doctor only</span>}</td>
                <td className="num">{users.filter((u) => u.clinicId === c.id && u.role === "doctor").length}</td>
                <td className="num">{users.filter((u) => u.clinicId === c.id && u.role === "nurse").length}</td>
                <td className="row-actions">
                  <Link href={`/admin/clinics/${c.id}`} className="btn btn-sm">Edit</Link>
                  <form action={deleteClinic}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton message={`Delete clinic ${c.name}?`}>Delete</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
