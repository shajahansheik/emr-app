"use client";

import { createContext, startTransition, useActionState, useContext } from "react";
import type { ActionState } from "@/app/actions/state";

const PendingContext = createContext(false);

/**
 * Form wrapper for server actions that shows errors/messages and keeps the entered
 * values on validation errors (a plain `action` prop would reset the form).
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        startTransition(() => formAction(fd));
      }}
    >
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {state?.message && <div className="alert alert-ok" role="status">{state.message}</div>}
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
    </form>
  );
}

export function SubmitButton({
  children,
  className = "btn btn-primary",
  name,
  value,
  confirm,
  noValidate,
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  confirm?: string;
  /** Skip browser validation of required fields (e.g. "Save draft"). */
  noValidate?: boolean;
}) {
  const pending = useContext(PendingContext);
  return (
    <button
      type="submit"
      className={className}
      name={name}
      value={value}
      disabled={pending}
      formNoValidate={noValidate}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
