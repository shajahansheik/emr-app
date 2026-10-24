import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { login } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ActionForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if ((await getStore().list("users")).length === 0) redirect("/setup");
  if (await getSessionUser()) redirect("/");
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand brand-lg"><span className="logo">✚</span> Simple EMR</div>
        <p className="muted">Sign in to continue</p>
        <ActionForm action={login}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="username" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <SubmitButton className="btn btn-primary btn-block">Sign in</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
