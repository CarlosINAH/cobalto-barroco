import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Movimientos de la bitácora (solo admin). Con `projectId`, acota a ese
 * proyecto; sin él, devuelve los últimos de toda la plataforma.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const db = await getDB();
  let movs = db.movimientos ?? [];
  if (projectId) movs = movs.filter((m) => m.projectId === projectId);
  const rows = [...movs]
    .reverse()
    .slice(0, 100)
    .map((m) => ({
      id: m.id,
      ts: m.ts,
      actor: m.actor,
      actorNombre: m.actorNombre,
      accion: m.accion,
      entidad: m.entidad,
      descripcion: m.descripcion ?? "",
    }));
  return NextResponse.json({ movimientos: rows });
}
