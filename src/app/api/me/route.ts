import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );
  // Mensajes sin leer para el usuario.
  const unread = db.messages.filter(
    (m) =>
      m.toUsername.toLowerCase() === session.username.toLowerCase() && !m.leido,
  ).length;
  return NextResponse.json({
    username: session.username,
    role: session.role,
    nombre: emp?.nombre || session.username,
    rol: emp?.rol || (session.role === "admin" ? "Administrador" : "Empleado"),
    unread,
  });
}
