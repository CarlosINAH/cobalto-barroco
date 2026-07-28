import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type MaterialRequest } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  const items =
    session.role === "admin"
      ? db.materials
      : db.materials.filter(
          (m) =>
            m.empleadoUsername.toLowerCase() === session.username.toLowerCase(),
        );
  return NextResponse.json({
    materials: [...items].sort((a, b) => b.createdAt - a.createdAt),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let b: Partial<MaterialRequest>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!b.item || !b.item.trim())
    return NextResponse.json({ error: "Indica el material." }, { status: 400 });

  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );

  const request: MaterialRequest = {
    id: newId("SOL"),
    empleadoUsername: session.username,
    proyectoId: b.proyectoId || emp?.proyectoId || null,
    item: b.item.trim(),
    cantidad: String(b.cantidad || "").trim() || "1",
    nota: b.nota?.trim() || "",
    estado: "pendiente",
    createdAt: Date.now(),
  };
  await mutate((d) => d.materials.unshift(request));
  return NextResponse.json({ ok: true, request });
}
