import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Directorio ligero de empleados (username + nombre) para selectores como los
 * integrantes del calendario. Accesible para cualquier usuario autenticado
 * (a diferencia de /api/employees, que es solo-admin y devuelve todo).
 */
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  const employees = db.employees.map((e) => ({
    username: e.username,
    nombre: e.nombre,
  }));
  return NextResponse.json({ employees });
}
