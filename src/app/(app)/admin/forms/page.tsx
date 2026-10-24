import Link from "next/link";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { listForms } from "@/lib/forms";
import { deleteForm } from "@/app/actions/forms";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { FormGroup } from "@/lib/types";
import { FormTabs } from "../FormTabs";

export default async function FormsPage() {
  await requireUser(["admin"]);
  const forms = await listForms();
  const groups = await getStore().list<FormGroup>("form_groups");
  const registration = forms.filter((f) => f.purpose === "patient_registration");
  const clinical = forms.filter((f) => f.purpose === "clinical").sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <div className="page-head">
        <h1>Form Builder</h1>
        <Link href="/admin/forms/new" className="btn btn-primary">+ New form</Link>
      </div>
      <FormTabs active="forms" />
      <p className="muted">
        Build each part of the case sheet as its own form (Vitals, Medication, Lab Investigations…). Then combine forms into
        a <Link href="/admin/form-groups">form group</Link> and map the group to doctors or nurses — the group appears on their case sheet page.
      </p>
      <div className="card flush">
        <table className="table">
          <thead><tr><th>Form</th><th className="num">Fields</th><th>Used in groups</th><th></th></tr></thead>
          <tbody>
            {clinical.map((f) => {
              const used = groups.filter((g) => g.formIds.includes(f.id));
              return (
                <tr key={f.id}>
                  <td>{f.name}<div className="muted small">{f.description}</div></td>
                  <td className="num">{f.fields.filter((x) => x.type !== "heading").length}</td>
                  <td>
                    {used.length ? used.map((g) => <Link key={g.id} href={`/admin/form-groups/${g.id}`} className="badge">{g.name}</Link>)
                      : <span className="muted small">Not in any group — not shown to anyone</span>}
                  </td>
                  <td className="row-actions">
                    <Link href={`/admin/forms/${f.id}`} className="btn btn-sm">Edit</Link>
                    <form action={deleteForm}>
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmButton message={`Delete form "${f.name}"? It is removed from its groups; data already captured stays in past visits.`}>Delete</ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {clinical.length === 0 && <tr><td colSpan={4} className="muted">No forms yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <h2>Patient registration</h2>
      <div className="card flush">
        <table className="table">
          <tbody>
            {registration.map((f) => (
              <tr key={f.id}>
                <td>{f.name}<div className="muted small">Used on Register Patient; not part of case sheet groups.</div></td>
                <td className="num">{f.fields.length} fields</td>
                <td className="row-actions"><Link href={`/admin/forms/${f.id}`} className="btn btn-sm">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
