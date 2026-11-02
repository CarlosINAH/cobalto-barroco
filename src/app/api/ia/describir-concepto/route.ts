import { NextResponse } from "next/server";
import { getSession, canWriteWorkArea } from "@/lib/auth-server";
import { geminiConfigured, geminiGenerate } from "@/lib/gemini";

export const runtime = "nodejs";

const SYSTEM =
  "Eres especialista en restauración y conservación de bienes culturales en el despacho Cobalto Barroco. " +
  "Redactas descripciones técnicas de conceptos de obra para cotizaciones: claras, profesionales y en español. " +
  "No inventes datos, materiales, cantidades ni precios que no te den. No uses viñetas ni encabezados: " +
  "entrega 2 a 4 oraciones de prosa corrida con el alcance del trabajo.";

/** Redacta la descripción/alcance técnico de un concepto con IA (solo quien
 *  escribe en el área de trabajo, pues consume cuota de la API). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s || !(await canWriteWorkArea(s)))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!geminiConfigured())
    return NextResponse.json({ error: "IA no configurada." }, { status: 409 });

  let b: { clave?: string; concepto?: string; unidad?: string; material?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const concepto = (b.concepto || "").trim();
  if (!concepto)
    return NextResponse.json({ error: "Falta el nombre del concepto." }, { status: 400 });

  const datos = [
    `Concepto: ${concepto}`,
    b.clave?.trim() ? `Clave: ${b.clave.trim()}` : "",
    b.unidad?.trim() ? `Unidad de medición: ${b.unidad.trim()}` : "",
    b.material?.trim() ? `Material a intervenir: ${b.material.trim()}` : "",
  ].filter(Boolean).join("\n");
  const prompt = `${datos}\n\nRedacta la descripción/alcance técnico de este concepto para la cotización.`;

  const texto = await geminiGenerate(prompt, { system: SYSTEM, temperature: 0.5, maxOutputTokens: 400 });
  if (!texto)
    return NextResponse.json({ error: "La IA no devolvió texto. Intenta de nuevo." }, { status: 502 });
  return NextResponse.json({ texto });
}
