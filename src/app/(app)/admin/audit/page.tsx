import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { AuditEntry } from "@/lib/types";
import { fmtDateTime } from "@/lib/util";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser(["admin"]);
  const { q = "" } = await searchParams;
  const all = await getStore().list<AuditEntry>("audit_log");
  const needle = q.toLowerCase();
  const rows = all
    .filter((a) => !needle || `${a.userName} ${a.action} ${a.entity} ${a.summary}`.toLowerCase().includes(needle))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 300);
  return (
    <>
      <div className="page-head">
        <h1>Activity Log</h1>
        <form className="inline-filters">
          <input name="q" defaultValue={q} placeholder="Search user, action…" aria-label="Search" />
          <button className="btn btn-sm">Search</button>
        </form>
      </div>
      <p className="muted small">Every create, update and delete is recorded here. Showing latest {rows.length}.</p>
      <div className="card flush">
        <table className="table">
          <thead><tr><th>When</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="nowrap">{fmtDateTime(a.createdAt)}</td>
                <td>{a.userName} <span className="muted small">({a.role})</span></td>
                <td><span className="badge">{a.action} {a.entity}</span></td>
                <td>{a.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
