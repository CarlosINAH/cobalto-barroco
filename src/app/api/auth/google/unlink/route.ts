import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate } from "@/lib/db";

export const runtime = "nodejs";

/** Desvincula la cuenta de Google del usuario autenticado. */
export async function POST() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  await mutate((d) => {
    const emp = d.employees.find(
      (e) => e.username.toLowerCase() === session.username.toLowerCase(),
    );
    if (emp) { emp.googleSub = undefined; emp.googleEmail = undefined; }
  });
  return NextResponse.json({ ok: true });
}
