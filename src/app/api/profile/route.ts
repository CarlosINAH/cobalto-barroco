import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type Employee } from "@/lib/db";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Perfil del usuario autenticado (sus datos de contacto). */
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );
  return NextResponse.json({
    username: session.username,
    nombre: emp?.nombre || session.username,
    rol: emp?.rol || "",
    email: emp?.email || "",
    telefono: emp?.telefono || "",
  });
}

/** Autoservicio: el usuario actualiza SUS propios datos de contacto. */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let b: { email?: string; telefono?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const email = (b.email || "").trim();
  const telefono = (b.telefono || "").trim();
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "El correo electrónico no es válido." },
      { status: 400 },
    );
  }

  const updated = await mutate((db) => {
    const emp = db.employees.find(
      (e) => e.username.toLowerCase() === session.username.toLowerCase(),
    );
    if (emp) {
      emp.email = email;
      emp.telefono = telefono;
      return emp;
    }
    // El usuario aún no tiene ficha (p. ej. admin): la creamos con sus datos.
    const nuevo: Employee = {
      id: newId("EMP"),
      username: session.username,
      nombre: session.username,
      email,
      telefono,
      rol: session.role === "admin" ? "Administrador" : "",
      ranking: 0,
      habilidades: [],
      proyectoId: null,
      createdAt: Date.now(),
    };
    db.employees.push(nuevo);
    return nuevo;
  });

  return NextResponse.json({
    ok: true,
    email: updated.email,
    telefono: updated.telefono || "",
  });
}
