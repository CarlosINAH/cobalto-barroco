import { NextResponse } from "next/server";
import { getSession, canWriteWorkArea } from "@/lib/auth-server";
import { getDB, mutate } from "@/lib/db";
import { normalizarCatalogo } from "@/lib/catalogo-normalizar";
import { registrarMovimiento } from "@/lib/bitacora";

export const runtime = "nodejs";

async function guard() {
  const s = await getSession();
  return s && (await canWriteWorkArea(s)) ? s : null;
}

/** Vista previa (no escribe): qué cambiaría la normalización del catálogo. */
export async function GET() {
  const s = await guard();
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = await getDB();
  const r = normalizarCatalogo(db.costMaterials);
  return NextResponse.json({
    total: db.costMaterials.length,
    reclasificados: r.reclasificados,
    eliminados: r.eliminados,
    duplicados: r.duplicados,
    resumen: r.resumen,
  });
}

/** Aplica la normalización al catálogo (reclasifica, anota duplicados y quita basura). */
export async function POST() {
  const s = await guard();
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const out = await mutate((d) => {
    const r = normalizarCatalogo(d.costMaterials);
    d.costMaterials = r.materiales;
    return {
      reclasificados: r.reclasificados,
      eliminados: r.eliminados.length,
      duplicados: r.duplicados.length,
      total: r.materiales.length,
    };
  });
  await registrarMovimiento(s, {
    accion: "normalizar",
    entidad: "catálogo",
    descripcion: `Normalizó el catálogo: ${out.reclasificados} reclasificados, ${out.eliminados} filas basura quitadas, ${out.duplicados} grupos de duplicados marcados`,
  });
  return NextResponse.json({ ok: true, ...out });
}
