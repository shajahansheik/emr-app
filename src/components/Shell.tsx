import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { canDoFrontDesk } from "@/lib/permissions";
import type { Context } from "@/lib/session";
import { getStore } from "@/lib/db";

type Item = { href: string; label: string };

function navFor({ user, clinic }: Context): Item[] {
  if (user.role === "admin") {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/admin/users", label: "Doctors & Nurses" },
      { href: "/admin/clinics", label: "Clinics" },
      { href: "/admin/forms", label: "Form Builder" },
      { href: "/reports", label: "Reports" },
      { href: "/admin/audit", label: "Activity Log" },
    ];
  }
  const items: Item[] = [{ href: "/queue", label: user.role === "doctor" ? "My Appointments" : "Today's Queue" }];
  if (canDoFrontDesk(user, clinic)) {
    items.push(
      { href: "/patients/new", label: "Register Patient" },
      { href: "/appointments/new", label: "Book Appointment" },
      { href: "/patients", label: "Patients" },
      { href: "/appointments", label: "All Appointments" }
    );
  }
  if (user.role === "doctor") items.push({ href: "/reports", label: "Reports" });
  return items;
}

export function Shell({ ctx, children }: { ctx: Context; children: React.ReactNode }) {
  const { user, clinic } = ctx;
  const mode = getStore().mode;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" aria-hidden>✚</span> Simple EMR
        </div>
        <div className="who">
          <div className="who-name">{user.role === "doctor" ? `Dr. ${user.name}` : user.name}</div>
          <div className="who-meta">
            <span className={`role role-${user.role}`}>{user.role}</span>
            {clinic && <span> · {clinic.name}</span>}
          </div>
          {clinic && user.role === "doctor" && !clinic.nurseEnabled && (
            <div className="who-note">Doctor-only clinic: you handle registration & booking</div>
          )}
        </div>
        <nav>
          {navFor(ctx).map((i) => (
            <Link key={i.href} href={i.href}>{i.label}</Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">Storage: {mode === "postgres" ? "Azure PostgreSQL" : "Local"}</div>
          <form action={logout}>
            <button className="btn btn-sm btn-block" type="submit">Log out</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
