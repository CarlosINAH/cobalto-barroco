import { NextResponse } from "next/server";
import { getSession, canWriteWorkArea } from "@/lib/auth-server";
import { geminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

/** Indica si la IA (Gemini) está disponible, para mostrar los botones. Solo a
 *  quien puede escribir en el área de trabajo (es quien la usaría). */
export async function GET() {
  const s = await getSession();
  if (!s || !(await canWriteWorkArea(s)))
    return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: geminiConfigured() });
}
