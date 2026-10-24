import type { FieldValue, FormField, TableRow } from "@/lib/types";
import { TableField } from "./TableField";

/** Renders the inputs of an admin-defined form. Input names are `<prefix><field key>`. */
export function DynamicFields({
  fields,
  values = {},
  prefix = "f_",
  disabled = false,
}: {
  fields: FormField[];
  values?: Record<string, FieldValue>;
  prefix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="form-grid">
      {fields.map((f) => {
        const name = prefix + f.key;
        const id = `fld_${name}`;
        const v = values[f.key];
        const cls = f.width === "half" ? "field" : "field field-full";
        if (f.type === "heading") {
          return <h3 key={f.key} className="field-full form-heading">{f.label}</h3>;
        }
        const label = (
          <label htmlFor={id}>
            {f.label}
            {f.unit && <span className="muted"> ({f.unit})</span>}
            {f.required && <span className="req"> *</span>}
          </label>
        );
        const common = { id, name, disabled, required: f.required, placeholder: f.placeholder };
        switch (f.type) {
          case "textarea":
            return <div key={f.key} className={cls}>{label}<textarea {...common} rows={3} defaultValue={String(v ?? "")} /></div>;
          case "select":
            return (
              <div key={f.key} className={cls}>
                {label}
                <select {...common} defaultValue={String(v ?? "")}>
                  <option value="">— Select —</option>
                  {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          case "radio":
            return (
              <fieldset key={f.key} className={cls}>
                <legend>{f.label}{f.required && <span className="req"> *</span>}</legend>
                <div className="choices">
                  {f.options?.map((o) => (
                    <label key={o} className="choice">
                      <input type="radio" name={name} value={o} disabled={disabled} required={f.required} defaultChecked={v === o} /> {o}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          case "table":
            return (
              <div key={f.key} className="field field-full">
                {label}
                <TableField name={name} columns={f.columns ?? []} initial={Array.isArray(v) ? (v as TableRow[]) : undefined} disabled={disabled} />
              </div>
            );
          case "multiselect": {
            const arr = Array.isArray(v) ? (v as string[]) : [];
            return (
              <fieldset key={f.key} className={cls}>
                <legend>{f.label}{f.required && <span className="req"> *</span>}</legend>
                <div className="choices">
                  {f.options?.map((o) => (
                    <label key={o} className="choice">
                      <input type="checkbox" name={name} value={o} disabled={disabled} defaultChecked={arr.includes(o)} /> {o}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          }
          case "checkbox":
            return (
              <div key={f.key} className={cls}>
                <label className="choice">
                  <input type="checkbox" id={id} name={name} disabled={disabled} defaultChecked={v === true} /> {f.label}
                  {f.required && <span className="req"> *</span>}
                </label>
              </div>
            );
          default: {
            const type = f.type === "phone" ? "tel" : f.type;
            return (
              <div key={f.key} className={cls}>
                {label}
                <input {...common} type={type} step={f.type === "number" ? "any" : undefined} defaultValue={v === null || v === undefined ? "" : String(v)} />
              </div>
            );
          }
        }
      })}
    </div>
  );
}
