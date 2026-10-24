import Link from "next/link";
import { saveClinic } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import type { Clinic } from "@/lib/types";

export function ClinicForm({ clinic }: { clinic?: Clinic }) {
  return (
    <ActionForm action={saveClinic} className="card narrow">
      <input type="hidden" name="id" value={clinic?.id ?? ""} />
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="name">Clinic name <span className="req">*</span></label>
          <input id="name" name="name" defaultValue={clinic?.name} required />
        </div>
        <div className="field field-full">
          <label htmlFor="address">Address</label>
          <input id="address" name="address" defaultValue={clinic?.address} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={clinic?.phone} />
        </div>
        <div className="field field-full">
          <label className="choice">
            <input type="checkbox" name="nurseEnabled" defaultChecked={clinic ? clinic.nurseEnabled : true} />
            This clinic has a nurse / front-desk user
          </label>
          <p className="muted small">
            Untick for clinics without a nurse: doctors there will get Register Patient, Book Appointment and Vitals in their menu.
          </p>
        </div>
      </div>
      <div className="form-actions">
        <Link href="/admin/clinics" className="btn">Cancel</Link>
        <SubmitButton>{clinic ? "Save changes" : "Create clinic"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
