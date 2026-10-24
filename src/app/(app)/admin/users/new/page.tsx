import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Clinic } from "@/lib/types";
import { UserForm } from "../UserForm";

export default async function NewUser() {
  await requireUser(["admin"]);
  const clinics = await getStore().list<Clinic>("clinics");
  return (<><h1>Add user</h1><UserForm clinics={clinics} /></>);
}
