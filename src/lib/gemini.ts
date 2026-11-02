import "server-only";

/**
 * Cliente mínimo de la API de Gemini (Google Generative Language), sin SDK.
 * Detrás de variables de entorno: GEMINI_API_KEY (obligatoria) y GEMINI_MODEL
 * (opcional; por defecto un modelo Flash). Si no hay API key, `geminiConfigured`
 * devuelve false y la plataforma ignora las funciones de IA.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Modelo a usar (configurable con GEMINI_MODEL). Flash por defecto: rápido y
 *  económico. Se puede sobrescribir si Google cambia la disponibilidad. */
export function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.8-flash";
}

export interface GeminiOptions {
  /** Instrucción de sistema (rol/estilo). */
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/** Resultado: texto generado, o un error con su causa (para mostrarla). */
export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

/**
 * Genera texto a partir de un prompt. Devuelve el texto o un error con el
 * motivo real de Google (para diagnóstico). Nunca lanza.
 */
export async function geminiGenerate(prompt: string, opts: GeminiOptions = {}): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, message: "GEMINI_API_KEY no configurada" };
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      // Amplio por defecto: los modelos "2.5" gastan tokens razonando y, con un
      // tope bajo, pueden no dejar texto de salida.
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  try {
    const res = await fetch(
      `${API_BASE}/${encodeURIComponent(geminiModel())}:generateContent?key=${encodeURIComponent(key)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    const data = (await res.json().catch(() => null)) as {
      error?: { message?: string; status?: string };
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    } | null;
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      return { ok: false, message: `${geminiModel()}: ${msg}` };
    }
    const cand = data?.candidates?.[0];
    const text = (cand?.content?.parts ?? []).map((p) => p.text || "").join("").trim();
    if (!text) {
      return { ok: false, message: `respuesta vacía (${cand?.finishReason || "sin candidatos"})` };
    }
    return { ok: true, text };
  } catch {
    return { ok: false, message: "error de conexión con Gemini" };
  }
}
