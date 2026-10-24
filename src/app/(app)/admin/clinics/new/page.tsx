import { requireUser } from "@/lib/session";
import { ClinicForm } from "../ClinicForm";

export default async function NewClinic() {
  await requireUser(["admin"]);
  return (<><h1>Add clinic</h1><ClinicForm /></>);
}
