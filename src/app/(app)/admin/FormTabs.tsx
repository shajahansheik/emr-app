import Link from "next/link";

export function FormTabs({ active }: { active: "forms" | "groups" }) {
  return (
    <div className="tabs">
      <Link href="/admin/forms" className={active === "forms" ? "tab active" : "tab"}>1. Forms</Link>
      <Link href="/admin/form-groups" className={active === "groups" ? "tab active" : "tab"}>2. Form groups & mapping</Link>
    </div>
  );
}
