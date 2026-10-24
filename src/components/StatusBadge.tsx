import type { AppointmentStatus } from "@/lib/types";

const LABELS: Record<AppointmentStatus, string> = {
  booked: "Booked",
  vitals_done: "Nurse done",
  in_consultation: "In consultation",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`status status-${status}`}>{LABELS[status]}</span>;
}
