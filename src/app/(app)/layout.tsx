import { Shell } from "@/components/Shell";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUser();
  return <Shell ctx={ctx}>{children}</Shell>;
}
