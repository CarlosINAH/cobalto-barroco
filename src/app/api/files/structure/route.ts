import { NextResponse } from "next/server";
import { getSession, credsForPath } from "@/lib/auth-server";
import { createStandardStructure, SHARED_ROOT } from "@/lib/shared-files";

export const runtime = "nodejs";

/**
 * Crea de una sola vez la estructura estándar de carpetas del servidor (del
 * Excel "ORGANIZACIÓN DEL SERVIDOR") bajo "Archivos compartidos". Es una acción
 * de organización del servidor: solo administradores. Idempotente (no pisa ni
 * duplica carpetas existentes).
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json(
      { error: "Solo un administrador puede crear la estructura estándar." },
      { status: 403 },
    );
  }

  const res = await createStandardStructure(credsForPath(session, SHARED_ROOT));
  if (!res.ok) {
    return NextResponse.json(
      { error: "No se pudo crear la estructura (¿permiso o conexión del NAS?)." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, created: res.created, total: res.total });
}
