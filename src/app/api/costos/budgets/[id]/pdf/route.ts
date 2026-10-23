import { getSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCotizacionPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return new Response("No autorizado.", { status: 403 });
  const { id } = await params;
  const db = await getDB();
  const budget = db.budgets.find((b) => b.id === id);
  if (!budget) return new Response("No encontrado.", { status: 404 });
  const proyecto = db.projects.find((p) => p.id === budget.projectId) ?? {
    id: budget.projectId,
    nombre: budget.nombre,
    ubicacion: "",
    inicio: "",
    entrega: "",
    avance: 0,
    estado: "activo" as const,
    desc: "",
    createdAt: 0,
  };

  const pdf = buildCotizacionPdf(proyecto, budget);
  const safe = (proyecto.nombre || "cotizacion").replace(/[^a-zA-Z0-9_-]+/g, "_");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Cotizacion_${safe}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
