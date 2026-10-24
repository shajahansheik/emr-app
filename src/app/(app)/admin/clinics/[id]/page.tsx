import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Clinic } from "@/lib/types";
import { ClinicForm } from "../ClinicForm";

export default async function EditClinic({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["admin"]);
  const clinic = await getStore().get<Clinic>("clinics", (await params).id);
  if (!clinic) notFound();
  return (<><h1>Edit {clinic.name}</h1><ClinicForm clinic={clinic} /></>);
}
