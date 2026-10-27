import { getSession, sectionLevel } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCVPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || (await sectionLevel(session, "cv")) === "oculto")
    return new Response("No autorizado.", { status: 403 });
  const db = await getDB();
  // Orden: por año desc y, dentro del año, por clave/orden de captura.
  const entries = [...db.cvEntries].sort((a, b) => b.anio - a.anio);
  const pdf = buildCVPdf(entries);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="CV_Cobalto_Barroco.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
