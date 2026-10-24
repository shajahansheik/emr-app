import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

/** Health probe for Azure App Service / load balancers. */
export async function GET() {
  try {
    const store = getStore();
    await store.list("clinics");
    return NextResponse.json({ ok: true, storage: store.mode });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
