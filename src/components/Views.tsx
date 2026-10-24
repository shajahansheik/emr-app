import type { FormDefinition, FormField, FormSubmission, Patient, TableRow } from "@/lib/types";
import { displayValue } from "@/lib/forms";
import { ageFrom, fmtDateTime } from "@/lib/util";

export function PatientBanner({ patient }: { patient: Patient }) {
  const allergies = String(patient.data.allergies ?? "").trim();
  return (
    <div className="patient-banner">
      <div>
        <div className="pb-name">{patient.fullName}</div>
        <div className="muted">
          {patient.mrn} · {[ageFrom(patient.dob), patient.gender].filter(Boolean).join(" / ")} · {patient.phone}
          {patient.data.bloodGroup ? ` · ${patient.data.bloodGroup}` : ""}
        </div>
      </div>
      {allergies && <div className="allergy">⚠ Allergies: {allergies}</div>}
    </div>
  );
}

/** Read-only rendering of a submitted dynamic form. Empty values are skipped. */
export function SubmissionView({ fields, submission, empty = "Not recorded" }: {
  fields: FormField[];
  submission?: FormSubmission;
  empty?: string;
}) {
  if (!submission) return <p className="muted">{empty}</p>;
  const rows = fields.filter((f) => f.type === "heading" || displayValue(f, submission.data[f.key]) !== "");
  return (
    <>
      <dl className="kv">
        {rows.map((f) =>
          f.type === "heading" ? (
            <h4 key={f.key} className="kv-heading">{f.label}</h4>
          ) : f.type === "table" ? (
            <div key={f.key} className="kv-table">
              <dt>{f.label}</dt>
              <dd><RowsTable field={f} rows={submission.data[f.key] as TableRow[]} /></dd>
            </div>
          ) : (
            <div key={f.key} className="kv-row">
              <dt>{f.label}</dt>
              <dd className="pre">{displayValue(f, submission.data[f.key])}</dd>
            </div>
          )
        )}
      </dl>
      <p className="muted small">Recorded by {submission.byName} · {fmtDateTime(submission.at)}</p>
    </>
  );
}

/** Read-only rendering of a "table" field value. */
export function RowsTable({ field, rows }: { field: FormField; rows: TableRow[] }) {
  const cols = field.columns ?? [];
  return (
    <table className="rows-table">
      <thead><tr><th>#</th>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}><td>{i + 1}</td>{cols.map((c) => <td key={c.key}>{r[c.key]}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

/** Every filled form of a visit as read-only cards, in the order given. */
export function SubmissionCards({ items, empty = "Nothing recorded yet." }: {
  items: { form: FormDefinition; submission: FormSubmission }[];
  empty?: string;
}) {
  if (!items.length) return <section className="card"><p className="muted">{empty}</p></section>;
  return (
    <>
      {items.map(({ form, submission }) => (
        <section key={form.key} className="card">
          <h2>{form.name}</h2>
          <SubmissionView fields={form.fields} submission={submission} />
        </section>
      ))}
    </>
  );
}
