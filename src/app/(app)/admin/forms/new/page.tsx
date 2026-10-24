import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { FormBuilder } from "@/components/FormBuilder";
import type { FormGroup } from "@/lib/types";

export default async function NewForm() {
  await requireUser(["admin"]);
  const groups = (await getStore().list<FormGroup>("form_groups")).map((g) => ({ id: g.id, name: g.name }));
  return (<><h1>New form</h1><FormBuilder groups={groups} /></>);
}
