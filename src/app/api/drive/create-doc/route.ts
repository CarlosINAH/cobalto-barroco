import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { driveAccessToken, driveCreateGoogleFile, type GoogleDocKind } from "@/lib/drive";
import { drivePermsForSession } from "@/lib/drive-perms";
import { registrarMovimiento } from "@/lib/bitacora";

export const runtime = "nodejs";

/** Crea un Google Doc u Hoja en blanco en el Drive central (rol con permiso de crear). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!(await drivePermsForSession(s)).crearCarpeta)
    return NextResponse.json({ error: "No tienes permiso para crear documentos." }, { status: 403 });
  const token = await driveAccessToken();
  if (!token)
    return NextResponse.json({ error: "Drive no conectado." }, { status: 409 });
  let b: { kind?: string; name?: string; parentId?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const kind: GoogleDocKind = b.kind === "spreadsheet" ? "spreadsheet" : "document";
  const name = (b.name || "").trim() || (kind === "spreadsheet" ? "Nueva hoja" : "Nuevo documento");
  try {
    const entry = await driveCreateGoogleFile(token, name, kind, b.parentId || "root");
    await registrarMovimiento(s, {
      accion: "crear", entidad: "archivo", entidadId: entry.id,
      descripcion: `Creó ${kind === "spreadsheet" ? "la hoja" : "el documento"} «${name}»`,
    });
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el documento." }, { status: 502 });
  }
}
