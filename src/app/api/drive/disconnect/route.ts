import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate } from "@/lib/db";

export const runtime = "nodejs";

/** Desconecta el Drive central (borra el refresh token guardado). Solo admin. */
export async function POST() {
  const s = await getSession();
  if (!s || s.role !== "admin")
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  await mutate((d) => { d.googleDrive = null; });
  return NextResponse.json({ ok: true });
}
