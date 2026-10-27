import { NextResponse } from "next/server";
import { requireWorkAreaWrite } from "@/lib/auth-server";
import { getDB, mutate, newId, type CostMaterial } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin() {
  return requireWorkAreaWrite();
}

export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = await getDB();
  return NextResponse.json({ materiales: db.costMaterials });
}

export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<CostMaterial>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const nombre = (b.nombre || "").trim();
  if (!nombre)
    return NextResponse.json(
      { error: "El nombre del material es obligatorio." },
      { status: 400 },
    );
  const kind =
    b.kind === "herramienta" || b.kind === "equipo" ? b.kind : "material";
  const now = Date.now();
  const material: CostMaterial = {
    id: newId("MAT"),
    nombre,
    kind,
    categoria: (b.categoria || "").trim(),
    precio: Number(b.precio) || 0,
    unidad: (b.unidad || "").trim(),
    url: (b.url || "").trim(),
    supplierId: b.supplierId ?? null,
    nota: (b.nota || "").trim(),
    actualizadoEn: now,
    createdAt: now,
  };
  await mutate((db) => db.costMaterials.push(material));
  return NextResponse.json({ ok: true, material });
}
