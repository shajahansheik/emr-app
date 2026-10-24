"use client";

import { useState } from "react";
import type { FieldType, FormDefinition, FormField, TableColumn } from "@/lib/types";
import { saveForm } from "@/app/actions/forms";
import { ActionForm, SubmitButton } from "./ActionForm";
import { DynamicFields } from "./DynamicFields";

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Paragraph",
  number: "Number",
  date: "Date",
  time: "Time",
  email: "Email",
  phone: "Phone",
  select: "Dropdown",
  radio: "Single choice (radio)",
  multiselect: "Multiple choice (checkboxes)",
  table: "Table (repeating rows)",
  checkbox: "Yes / No checkbox",
  heading: "Section heading",
};
const CHOICE: FieldType[] = ["select", "radio", "multiselect"];

const toKey = (label: string) => {
  const words = label.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  const key = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join("");
  return /^[a-zA-Z]/.test(key) ? key : `field${key}`;
};

type Editable = FormField & { _new?: boolean };

const COLUMN_TYPES: Record<TableColumn["type"], string> = { text: "Text", number: "Number", select: "Dropdown", date: "Date" };

/** Editor for the columns of a "table" field. */
function ColumnsEditor({ columns, onChange, savedKeys }: {
  columns: TableColumn[];
  onChange: (c: TableColumn[]) => void;
  /** Keys of columns that already hold data; they keep their key when relabelled. */
  savedKeys: Set<string>;
}) {
  const set = (i: number, patch: Partial<TableColumn>) => onChange(columns.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="field field-full">
      <label>Columns</label>
      <table className="table table-input">
        <thead><tr><th>Label</th><th>Type</th><th>Options (comma separated)</th><th /></tr></thead>
        <tbody>
          {columns.map((c, i) => (
            <tr key={i}>
              <td><input aria-label={`Column ${i + 1} label`} value={c.label} onChange={(e) => set(i, { label: e.target.value, ...(savedKeys.has(c.key) ? {} : { key: toKey(e.target.value) }) })} /></td>
              <td>
                <select aria-label={`Column ${i + 1} type`} value={c.type} onChange={(e) => set(i, { type: e.target.value as TableColumn["type"] })}>
                  {Object.entries(COLUMN_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </td>
              <td>
                {c.type === "select" && (
                  <input aria-label={`Column ${i + 1} options`} value={(c.options ?? []).join(",")} onChange={(e) => set(i, { options: e.target.value.split(",") })} />
                )}
              </td>
              <td><button type="button" className="btn btn-sm btn-danger" aria-label={`Remove column ${i + 1}`} onClick={() => onChange(columns.filter((_, j) => j !== i))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button type="button" className="btn btn-sm" onClick={() => onChange([...columns, { key: `col${columns.length + 1}`, label: `Column ${columns.length + 1}`, type: "text" }])}>
          + Add column
        </button>
      </div>
    </div>
  );
}

export function FormBuilder({ form, groups = [] }: { form?: FormDefinition; groups?: { id: string; name: string }[] }) {
  const [fields, setFields] = useState<Editable[]>(form?.fields ?? []);
  const [open, setOpen] = useState<number | null>(null);

  const update = (i: number, patch: Partial<Editable>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: number) =>
    setFields((fs) => {
      const j = i + d;
      if (j < 0 || j >= fs.length) return fs;
      const next = [...fs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = () => {
    const taken = new Set(fields.map((f) => f.key));
    let n = fields.length + 1;
    while (taken.has(`field${n}`)) n++;
    setFields((fs) => [...fs, { key: `field${n}`, label: `New field ${n}`, type: "text", width: "half", _new: true }]);
    setOpen(fields.length);
  };

  // Options are edited as raw lines; blank lines are dropped here.
  const clean = (o: string[]) => [...new Set(o.map((x) => x.trim()).filter(Boolean))];
  const cleaned: FormField[] = fields.map(({ _new, ...f }) => ({
    ...f,
    ...(f.options ? { options: clean(f.options) } : {}),
    ...(f.columns ? { columns: f.columns.map((c) => (c.options ? { ...c, options: clean(c.options) } : c)) } : {}),
  }));
  const payload = JSON.stringify(cleaned);

  return (
    <ActionForm action={saveForm} className="builder">
      <input type="hidden" name="id" value={form?.id ?? ""} />
      <input type="hidden" name="fields" value={payload} />
      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Form name <span className="req">*</span></label>
            <input id="name" name="name" defaultValue={form?.name} required />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <input id="description" name="description" defaultValue={form?.description} />
          </div>
          {!form && groups.length > 0 && (
            <div className="field">
              <label htmlFor="addToGroup">Add to form group (optional)</label>
              <select id="addToGroup" name="addToGroup" defaultValue="">
                <option value="">— Don&apos;t add now —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="builder-cols">
        <div>
          <h2>Fields</h2>
          <ol className="field-list">
            {fields.map((f, i) => (
              <li key={i} className={open === i ? "field-item open" : "field-item"}>
                <div className="field-item-head">
                  <button type="button" className="link" onClick={() => setOpen(open === i ? null : i)}>
                    <strong>{f.label || "(no label)"}</strong>{" "}
                    <span className="muted">· {TYPE_LABELS[f.type]}{f.required ? " · required" : ""}</span>
                    {f.system && <span className="badge">system</span>}
                  </button>
                  <span className="row-actions">
                    <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button type="button" className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label="Move down">↓</button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      disabled={f.system}
                      title={f.system ? "System fields are used by the application and cannot be removed" : "Remove"}
                      onClick={() => { setFields((fs) => fs.filter((_, j) => j !== i)); setOpen(null); }}
                    >
                      ✕
                    </button>
                  </span>
                </div>
                {open === i && (
                  <div className="form-grid field-editor">
                    <div className="field">
                      <label>Label</label>
                      <input aria-label="Field label"
                        value={f.label}
                        onChange={(e) => update(i, { label: e.target.value, ...(f._new ? { key: toKey(e.target.value) } : {}) })}
                      />
                    </div>
                    <div className="field">
                      <label>Field key</label>
                      <input aria-label="Field key" value={f.key} disabled={f.system} onChange={(e) => update(i, { key: e.target.value, _new: false })} />
                    </div>
                    <div className="field">
                      <label>Type</label>
                      <select aria-label="Field type" value={f.type} disabled={f.system} onChange={(e) => {
                        const type = e.target.value as FieldType;
                        update(i, { type, width: type === "table" ? "full" : f.width, ...(type === "table" && !f.columns?.length ? { columns: [{ key: "item", label: "Item", type: "text" }] } : {}) });
                      }}>
                        {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Width</label>
                      <select aria-label="Field width" value={f.width ?? "full"} onChange={(e) => update(i, { width: e.target.value as "full" | "half" })}>
                        <option value="half">Half row</option>
                        <option value="full">Full row</option>
                      </select>
                    </div>
                    {CHOICE.includes(f.type) && (
                      <div className="field field-full">
                        <label>Options (one per line)</label>
                        <textarea aria-label="Field options"
                          rows={4}
                          value={(f.options ?? []).join("\n")}
                          onChange={(e) => update(i, { options: e.target.value.split("\n") })}
                        />
                      </div>
                    )}
                    {f.type === "table" && <ColumnsEditor
                        columns={f.columns ?? []}
                        onChange={(columns) => update(i, { columns })}
                        savedKeys={new Set(form?.fields.find((x) => x.key === f.key)?.columns?.map((c) => c.key))}
                      />}
                    {f.type !== "heading" && (
                      <>
                        <div className="field">
                          <label>Placeholder</label>
                          <input aria-label="Field placeholder" value={f.placeholder ?? ""} onChange={(e) => update(i, { placeholder: e.target.value || undefined })} />
                        </div>
                        <div className="field">
                          <label>Unit (e.g. mmHg)</label>
                          <input aria-label="Field unit" value={f.unit ?? ""} onChange={(e) => update(i, { unit: e.target.value || undefined })} />
                        </div>
                        <div className="field field-full">
                          <label className="choice">
                            <input type="checkbox" checked={!!f.required} disabled={f.system} onChange={(e) => update(i, { required: e.target.checked })} />
                            Required
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
          <button type="button" className="btn" onClick={add}>+ Add field</button>
        </div>
        <div>
          <h2>Live preview</h2>
          <div className="card preview">
            <fieldset disabled className="plain"><DynamicFields fields={cleaned} prefix="preview_" /></fieldset>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <a href="/admin/forms" className="btn">Cancel</a>
        <SubmitButton>Save form</SubmitButton>
      </div>
    </ActionForm>
  );
}
