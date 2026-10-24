import Link from "next/link";
import { savePatient } from "@/app/actions/clinical";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { DynamicFields } from "@/components/DynamicFields";
import type { FormDefinition, Patient } from "@/lib/types";

export function PatientForm({ form, patient }: { form: FormDefinition; patient?: Patient }) {
  return (
    <ActionForm action={savePatient} className="card">
      <input type="hidden" name="id" value={patient?.id ?? ""} />
      <DynamicFields fields={form.fields} values={patient?.data} />
      <div className="form-actions">
        <Link href={patient ? `/patients/${patient.id}` : "/patients"} className="btn">Cancel</Link>
        <SubmitButton className="btn" name="next" value="view">Save</SubmitButton>
        {!patient && <SubmitButton name="next" value="book">Save & book appointment</SubmitButton>}
      </div>
    </ActionForm>
  );
}
