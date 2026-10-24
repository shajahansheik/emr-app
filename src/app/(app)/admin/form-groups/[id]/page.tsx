import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { FormGroupEditor } from "@/components/FormGroupEditor";
import type { FormGroup } from "@/lib/types";
import { loadEditorData } from "../load";

export default async function EditFormGroup({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["admin"]);
  const group = await getStore().get<FormGroup>("form_groups", (await params).id);
  if (!group) notFound();
  return (<><h1>Edit form group: {group.name}</h1><FormGroupEditor group={group} {...await loadEditorData()} /></>);
}
