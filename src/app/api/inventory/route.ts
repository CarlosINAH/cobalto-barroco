import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type InventoryItem } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  return NextResponse.json({ inventory: db.inventory });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<InventoryItem>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!b.nombre || !b.nombre.trim())
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  const item: InventoryItem = {
    id: newId("INV"),
    nombre: b.nombre.trim(),
    categoria: b.categoria?.trim() || "",
    cantidad: Number(b.cantidad) || 0,
    unidad: b.unidad?.trim() || "u",
    ubicacion: b.ubicacion?.trim() || "",
    nota: b.nota?.trim() || "",
    createdAt: Date.now(),
  };
  await mutate((db) => db.inventory.unshift(item));
  return NextResponse.json({ ok: true, item });
}
