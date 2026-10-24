import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canDoFrontDesk } from "@/lib/permissions";
import { getRegistrationForm } from "@/lib/forms";
import type { Patient } from "@/lib/types";
import { PatientForm } from "../../PatientForm";

export default async function EditPatient({ params }: { params: Promise<{ id: string }> }) {
  const { user, clinic } = await requireUser(["doctor", "nurse"]);
  if (!canDoFrontDesk(user, clinic)) redirect("/queue");
  const patient = await getStore().get<Patient>("patients", (await params).id);
  if (!patient || patient.clinicId !== user.clinicId) notFound();
  const form = await getRegistrationForm();
  return (<><h1>Edit {patient.fullName}</h1><PatientForm form={form} patient={patient} /></>);
}
