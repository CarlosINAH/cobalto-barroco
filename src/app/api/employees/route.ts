import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type Employee } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const db = await getDB();
  return NextResponse.json({ employees: db.employees });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  let b: Partial<Employee> & { habilidades?: string[] | string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const username = (b.username || "").trim();
  if (!username) {
    return NextResponse.json(
      { error: "El usuario del NAS es obligatorio." },
      { status: 400 },
    );
  }
  const db = await getDB();
  if (
    db.employees.some(
      (e) => e.username.toLowerCase() === username.toLowerCase(),
    )
  ) {
    return NextResponse.json(
      { error: "Ya existe un empleado con ese usuario." },
      { status: 409 },
    );
  }
  const habilidades = Array.isArray(b.habilidades)
    ? b.habilidades
    : String(b.habilidades || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const employee: Employee = {
    id: newId("EMP"),
    username,
    nombre: b.nombre?.trim() || username,
    email: b.email?.trim() || "",
    telefono: b.telefono?.trim() || "",
    rol: b.rol?.trim() || "",
    ranking: Math.max(0, Math.min(100, Number(b.ranking) || 0)),
    habilidades,
    proyectoId: b.proyectoId || null,
    createdAt: Date.now(),
  };
  await mutate((db) => db.employees.push(employee));
  return NextResponse.json({ ok: true, employee });
}
