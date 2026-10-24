import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canDoFrontDesk } from "@/lib/permissions";
import { getRegistrationForm } from "@/lib/forms";
import { PatientForm } from "../PatientForm";

export default async function NewPatient() {
  const { user, clinic } = await requireUser(["doctor", "nurse"]);
  if (!canDoFrontDesk(user, clinic)) redirect("/queue");
  const form = await getRegistrationForm();
  return (<><h1>Register patient</h1><PatientForm form={form} /></>);
}
