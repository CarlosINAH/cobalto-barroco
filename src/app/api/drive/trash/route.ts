import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { driveAccessToken, driveTrash, driveListTrashed, driveFileMeta } from "@/lib/drive";
import { drivePermsForSession } from "@/lib/drive-perms";
import { registrarMovimiento } from "@/lib/bitacora";

export const runtime = "nodejs";

/** Lista lo que hay en la papelera del Drive (cualquier sesión con permiso de ver). */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!(await drivePermsForSession(s)).ver)
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const token = await driveAccessToken();
  if (!token)
    return NextResponse.json({ error: "Drive no conectado." }, { status: 409 });
  try {
    const entries = await driveListTrashed(token);
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "No se pudo leer la papelera." }, { status: 502 });
  }
}

/** Manda un archivo/carpeta a la papelera de Drive (recuperable). */
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

  const meta = await driveFileMeta(token, id);
  const ok = await driveTrash(token, id);
  if (!ok)
    return NextResponse.json({ error: "No se pudo mandar a la papelera." }, { status: 502 });
  await registrarMovimiento(s, {
    accion: "papelera",
    entidad: "archivo",
    entidadId: id,
    descripcion: `Mandó a la papelera: ${meta?.name || id}`,
  });
  return NextResponse.json({ ok: true });
}
