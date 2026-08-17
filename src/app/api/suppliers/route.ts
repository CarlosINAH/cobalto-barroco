import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type Supplier } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const db = await getDB();
  return NextResponse.json({ suppliers: db.suppliers });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  let b: Partial<Supplier>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const nombre = (b.nombre || "").trim();
  if (!nombre) {
    return NextResponse.json(
      { error: "El nombre del proveedor es obligatorio." },
      { status: 400 },
    );
  }
  const supplier: Supplier = {
    id: newId("PRV"),
    nombre,
    contacto: (b.contacto || "").trim(),
    telefono: (b.telefono || "").trim(),
    email: (b.email || "").trim(),
    categoria: (b.categoria || "").trim(),
    direccion: (b.direccion || "").trim(),
    nota: (b.nota || "").trim(),
    createdAt: Date.now(),
  };
  await mutate((db) => db.suppliers.push(supplier));
  return NextResponse.json({ ok: true, supplier });
}
