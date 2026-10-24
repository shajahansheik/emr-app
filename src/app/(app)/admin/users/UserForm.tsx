import Link from "next/link";
import { saveUser } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import type { Clinic, User } from "@/lib/types";

export function UserForm({ user, clinics }: { user?: User; clinics: Clinic[] }) {
  return (
    <ActionForm action={saveUser} className="card narrow">
      <input type="hidden" name="id" value={user?.id ?? ""} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Full name <span className="req">*</span></label>
          <input id="name" name="name" defaultValue={user?.name} required />
        </div>
        <div className="field">
          <label htmlFor="username">Username <span className="req">*</span></label>
          <input id="username" name="username" defaultValue={user?.username} required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue={user?.role ?? "doctor"}>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="clinicId">Clinic (doctors & nurses)</label>
          <select id="clinicId" name="clinicId" defaultValue={user?.clinicId ?? clinics[0]?.id ?? ""}>
            <option value="">—</option>
            {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}{c.nurseEnabled ? "" : " (doctor-only)"}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="specialization">Specialization (doctors)</label>
          <input id="specialization" name="specialization" defaultValue={user?.specialization} placeholder="General Medicine" />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" defaultValue={user?.phone} />
        </div>
        <div className="field">
          <label htmlFor="password">{user ? "New password (leave blank to keep)" : "Password"} {!user && <span className="req">*</span>}</label>
          <input id="password" name="password" type="password" minLength={8} required={!user} autoComplete="new-password" />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <label className="choice"><input type="checkbox" name="active" defaultChecked={user ? user.active : true} /> Active (can log in)</label>
        </div>
      </div>
      <div className="form-actions">
        <Link href="/admin/users" className="btn">Cancel</Link>
        <SubmitButton>{user ? "Save changes" : "Create user"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
