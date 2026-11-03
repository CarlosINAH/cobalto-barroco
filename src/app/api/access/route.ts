import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listAccess, setAccess } from "@/lib/access";
import { registrarMovimiento } from "@/lib/bitacora";
import type { PerfilSistema } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getSession();
  return session && session.role === "admin" ? session : null;
}

const PERFILES: PerfilSistema[] = [
  "administracion",
  "superintendente",
  "residente",
  "restaurador",
];

/** Lista las solicitudes de acceso (para el panel del admin). */
export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const solicitudes = await listAccess();
  return NextResponse.json({ solicitudes });
}

/** Aprueba o rechaza una solicitud de acceso, asignando perfil al aprobar. */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let b: { username?: string; estado?: string; perfil?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const username = (b.username || "").trim();
  const estado =
    b.estado === "aprobado" || b.estado === "rechazado" ? b.estado : null;
  if (!username || !estado)
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });

  const perfil =
    estado === "aprobado" && PERFILES.includes(b.perfil as PerfilSistema)
      ? (b.perfil as PerfilSistema)
      : undefined;

  const entry = await setAccess(username, estado, admin.username, perfil);
  if (!entry)
    return NextResponse.json({ error: "No se pudo registrar." }, { status: 500 });

  await registrarMovimiento(admin, {
    accion: estado === "aprobado" ? "aprobar" : "rechazar",
    entidad: "acceso",
    entidadId: username,
    descripcion:
      estado === "aprobado"
        ? `Acceso aprobado para ${entry.nombre || username}${perfil ? ` (${perfil})` : ""}`
        : `Acceso rechazado para ${entry.nombre || username}`,
  });

  return NextResponse.json({ ok: true, entry });
}
