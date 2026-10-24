import type { FormSubmission } from "@/lib/types";
import type { ResolvedGroup } from "@/lib/forms";
import { formPrefix } from "@/lib/forms";
import { DynamicFields } from "./DynamicFields";

/** Editable case sheet: each assigned form group with its forms, prefilled from saved submissions. */
export function GroupSections({ groups, submissions }: { groups: ResolvedGroup[]; submissions: Record<string, FormSubmission> }) {
  return (
    <>
      {groups.map(({ group, forms }) => (
        <div key={group.id} className="group-block">
          {groups.length > 1 && <div className="group-title">{group.name}</div>}
          {forms.map((f) => (
            <section key={f.id} className="card">
              <h2>{f.name} {f.description && <span className="muted small h-desc">— {f.description}</span>}</h2>
              <DynamicFields fields={f.fields} values={submissions[f.key]?.data} prefix={formPrefix(f.key)} />
            </section>
          ))}
        </div>
      ))}
    </>
  );
}
