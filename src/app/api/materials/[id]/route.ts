import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  let b: { estado?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const estado =
    b.estado === "aprobado" || b.estado === "rechazado" || b.estado === "pendiente"
      ? b.estado
      : null;
  if (!estado)
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });

  const updated = await mutate((db) => {
    const m = db.materials.find((x) => x.id === id);
    if (!m) return null;
    m.estado = estado;
    return m;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, request: updated });
}
