import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { driveAccessToken, driveDeleteForever, driveFileMeta } from "@/lib/drive";
import { drivePermsForSession } from "@/lib/drive-perms";
import { registrarMovimiento } from "@/lib/bitacora";

export const runtime = "nodejs";

/** Borra definitivamente un elemento (no recuperable). Solo admin (borrarReal). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!(await drivePermsForSession(s)).borrarReal)
    return NextResponse.json({ error: "Solo un administrador puede borrar definitivamente." }, { status: 403 });
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
  const ok = await driveDeleteForever(token, id);
  if (!ok)
    return NextResponse.json({ error: "No se pudo borrar." }, { status: 502 });
  await registrarMovimiento(s, {
    accion: "borrar",
    entidad: "archivo",
    entidadId: id,
    descripcion: `Borró definitivamente: ${meta?.name || id}`,
  });
  return NextResponse.json({ ok: true });
}
