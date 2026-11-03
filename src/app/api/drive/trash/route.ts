import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { driveAccessToken, driveTrash } from "@/lib/drive";
import { drivePermsForSession } from "@/lib/drive-perms";

export const runtime = "nodejs";

/** Manda un archivo/carpeta a la papelera de Drive (recuperable). Requiere el
 *  permiso `papelera` (todos los roles lo tienen; borrar definitivo es aparte). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!(await drivePermsForSession(s)).papelera)
    return NextResponse.json({ error: "No tienes permiso para eliminar." }, { status: 403 });
  const token = await driveAccessToken();
  if (!token)
    return NextResponse.json({ error: "Drive no conectado." }, { status: 409 });

  let b: { id?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const id = (b.id || "").trim();
  if (!id) return NextResponse.json({ error: "Falta el id." }, { status: 400 });

  const ok = await driveTrash(token, id);
  if (!ok)
    return NextResponse.json({ error: "No se pudo mandar a la papelera." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
