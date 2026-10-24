import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { FormBuilder } from "@/components/FormBuilder";
import type { FormDefinition } from "@/lib/types";

export default async function EditForm({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["admin"]);
  const form = await getStore().get<FormDefinition>("forms", (await params).id);
  if (!form) notFound();
  return (<><h1>Edit form: {form.name}</h1><FormBuilder form={form} /></>);
}
