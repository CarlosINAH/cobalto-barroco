import { getSession } from "@/lib/auth-server";
import { buildConstanciaPdf, type ConstanciaData } from "@/lib/pdf";

export const runtime = "nodejs";

/**
 * Genera el PDF de una constancia de trabajo. POST (no GET) para no pasar
 * datos personales en la URL. Solo admin.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return new Response("No autorizado.", { status: 403 });
  let b: Partial<ConstanciaData>;
  try {
    b = await req.json();
  } catch {
    return new Response("Solicitud inválida.", { status: 400 });
  }
  const data: ConstanciaData = {
    participante: (b.participante || "").trim(),
    proyecto: (b.proyecto || "").trim(),
    ubicacion: (b.ubicacion || "").trim(),
    periodo: (b.periodo || "").trim(),
    firmanteNombre: (b.firmanteNombre || "").trim(),
    firmanteCargo: (b.firmanteCargo || "").trim(),
    fecha: (b.fecha || "").trim() || undefined,
  };
  if (!data.participante)
    return new Response("Falta el nombre del participante.", { status: 400 });

  const pdf = buildConstanciaPdf(data);
  const safe = data.participante.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Constancia_${safe}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
