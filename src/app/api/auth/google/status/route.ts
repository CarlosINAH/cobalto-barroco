import { NextResponse } from "next/server";
import { googleConfigured } from "@/lib/google";

export const runtime = "nodejs";

/** Indica si la integración con Google está configurada (para mostrar el botón
 *  de "Entrar con Google" en el login). Público: no expone secretos. */
export async function GET() {
  return NextResponse.json({ enabled: googleConfigured() });
}
