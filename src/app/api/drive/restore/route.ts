import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { driveAccessToken, driveRestore, driveFileMeta } from "@/lib/drive";
import { drivePermsForSession } from "@/lib/drive-perms";
import { registrarMovimiento } from "@/lib/bitacora";

export const runtime = "nodejs";

/** Restaura un elemento de la papelera (requiere permiso de papelera). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!(await drivePermsForSession(s)).papelera)
    return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
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

  const meta = await driveFileMeta(token, id);
  const ok = await driveRestore(token, id);
  if (!ok)
    return NextResponse.json({ error: "No se pudo restaurar." }, { status: 502 });
  await registrarMovimiento(s, {
    accion: "restaurar",
    entidad: "archivo",
    entidadId: id,
    descripcion: `Restauró de la papelera: ${meta?.name || id}`,
  });
  return NextResponse.json({ ok: true });
}
