import Link from "next/link";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ensureDefaultForms } from "@/lib/forms";
import { deleteFormGroup } from "@/app/actions/forms";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { Clinic, FormDefinition, FormGroup, User } from "@/lib/types";
import { FormTabs } from "../FormTabs";

export default async function FormGroupsPage() {
  await requireUser(["admin"]);
  await ensureDefaultForms();
  const store = getStore();
  const [groups, forms, users, clinics] = await Promise.all([
    store.list<FormGroup>("form_groups"),
    store.list<FormDefinition>("forms"),
    store.list<User>("users"),
    store.list<Clinic>("clinics"),
  ]);
  const fname = new Map(forms.map((f) => [f.id, f.name]));
  const uname = new Map(users.map((u) => [u.id, u.role === "doctor" ? `Dr. ${u.name}` : u.name]));
  const cname = new Map(clinics.map((c) => [c.id, c.name]));
  const sorted = [...groups].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return (
    <>
      <div className="page-head">
        <h1>Form Builder</h1>
        <Link href="/admin/form-groups/new" className="btn btn-primary">+ New form group</Link>
      </div>
      <FormTabs active="groups" />
      <p className="muted">
        A form group is an ordered set of forms. Map it to <strong>all doctors</strong>, <strong>all nurses</strong> or specific users
        (optionally only in some clinics). Nurse groups appear on the nurse case sheet; doctor groups on the doctor&apos;s consultation case sheet.
      </p>
      <div className="card flush">
        <table className="table">
          <thead><tr><th className="num">#</th><th>Group</th><th>Forms (in order)</th><th>Mapped to</th><th>Clinics</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {sorted.map((g) => (
              <tr key={g.id}>
                <td className="num">{g.order}</td>
                <td>{g.name}<div className="muted small">{g.description}</div></td>
                <td>{g.formIds.map((id, i) => <div key={id} className="small">{i + 1}. {fname.get(id) ?? "(deleted)"}</div>)}</td>
                <td>
                  {g.roles.map((r) => <span key={r} className={`role role-${r}`}>All {r}s </span>)}
                  {g.userIds.map((id) => <div key={id} className="small">{uname.get(id) ?? "(deleted user)"}</div>)}
                </td>
                <td className="small">{g.clinicIds.length ? g.clinicIds.map((id) => cname.get(id)).join(", ") : "All clinics"}</td>
                <td>{g.active ? <span className="status status-completed">Active</span> : <span className="status status-cancelled">Inactive</span>}</td>
                <td className="row-actions">
                  <Link href={`/admin/form-groups/${g.id}`} className="btn btn-sm">Edit</Link>
                  <form action={deleteFormGroup}>
                    <input type="hidden" name="id" value={g.id} />
                    <ConfirmButton message={`Delete group "${g.name}"? Its forms are kept.`}>Delete</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={7} className="muted">No groups yet — doctors and nurses will see empty case sheets.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
