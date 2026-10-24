import { requireUser } from "@/lib/session";
import { FormGroupEditor } from "@/components/FormGroupEditor";
import { loadEditorData } from "../load";

export default async function NewFormGroup() {
  await requireUser(["admin"]);
  return (<><h1>New form group</h1><FormGroupEditor {...await loadEditorData()} /></>);
}
