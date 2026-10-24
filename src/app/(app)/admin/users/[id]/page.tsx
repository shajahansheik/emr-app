import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Clinic, User } from "@/lib/types";
import { UserForm } from "../UserForm";

export default async function EditUser({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["admin"]);
  const { id } = await params;
  const store = getStore();
  const [user, clinics] = await Promise.all([store.get<User>("users", id), store.list<Clinic>("clinics")]);
  if (!user) notFound();
  return (<><h1>Edit {user.name}</h1><UserForm user={user} clinics={clinics} /></>);
}
