import Link from "next/link";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { deleteUser } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { Clinic, User } from "@/lib/types";
import { Flash } from "../Flash";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; error?: string; message?: string }> }) {
  const { user: me } = await requireUser(["admin"]);
  const { role = "", error, message } = await searchParams;
  const store = getStore();
  const [users, clinics] = await Promise.all([store.list<User>("users"), store.list<Clinic>("clinics")]);
  const cname = new Map(clinics.map((c) => [c.id, c.name]));
  const rows = users.filter((u) => !role || u.role === role).sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  return (
    <>
      <div className="page-head">
        <h1>Doctors, Nurses & Admins</h1>
        <Link href="/admin/users/new" className="btn btn-primary">+ Add user</Link>
      </div>
      <Flash error={error} message={message} />
      <div className="tabs">
        {[["", "All"], ["doctor", "Doctors"], ["nurse", "Nurses"], ["admin", "Admins"]].map(([v, l]) => (
          <Link key={v} href={v ? `?role=${v}` : "?"} className={role === v ? "tab active" : "tab"}>{l}</Link>
        ))}
      </div>
      <div className="card flush">
        <table className="table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Clinic</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.role === "doctor" ? "Dr. " : ""}{u.name}{u.specialization && <div className="muted small">{u.specialization}</div>}</td>
                <td>{u.username}</td>
                <td><span className={`role role-${u.role}`}>{u.role}</span></td>
                <td>{u.clinicId ? cname.get(u.clinicId) ?? "—" : "—"}</td>
                <td>{u.active ? <span className="status status-completed">Active</span> : <span className="status status-cancelled">Inactive</span>}</td>
                <td className="row-actions">
                  <Link href={`/admin/users/${u.id}`} className="btn btn-sm">Edit</Link>
                  {u.id !== me.id && (
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <ConfirmButton message={`Delete ${u.name}? Users with clinical records are deactivated instead.`}>Delete</ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="muted">No users.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
