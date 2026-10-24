import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { setup } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ActionForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const store = getStore();
  if ((await store.list("users")).length > 0) redirect("/login");
  return (
    <div className="auth-page">
      <div className="auth-card auth-wide">
        <div className="brand brand-lg"><span className="logo">✚</span> Simple EMR — first-time setup</div>
        <p className="muted">
          Storage mode:{" "}
          <strong>{store.mode === "postgres" ? "Azure Database for PostgreSQL" : "Local data"}</strong>
        </p>
        <ActionForm action={setup}>
          <h3>Clinic</h3>
          <div className="field">
            <label htmlFor="clinicName">Clinic name</label>
            <input id="clinicName" name="clinicName" required />
          </div>
          <label className="choice">
            <input type="checkbox" name="nurseEnabled" defaultChecked /> This clinic has a nurse / front-desk user
          </label>
          <p className="muted small">Untick for clinics where the doctor registers patients and books appointments directly.</p>
          <h3>Administrator account</h3>
          <div className="form-grid">
            <div className="field field-full">
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" required />
            </div>
            <div className="field field-full">
              <label htmlFor="username">Username</label>
              <input id="username" name="username" required autoComplete="username" />
            </div>
            <div className="field">
              <label htmlFor="password">Password (min 8 characters)</label>
              <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" />
            </div>
          </div>
          <SubmitButton className="btn btn-primary btn-block">Create clinic & admin</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
