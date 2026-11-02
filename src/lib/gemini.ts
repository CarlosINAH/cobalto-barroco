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

/** Modelo a usar (configurable). Flash por defecto: rápido y económico. */
export function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

export interface GeminiOptions {
  /** Instrucción de sistema (rol/estilo). */
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Genera texto a partir de un prompt. Devuelve el texto o null si no está
 * configurado o la API falla. Nunca lanza.
 */
export async function geminiGenerate(prompt: string, opts: GeminiOptions = {}): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 600,
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  try {
    const res = await fetch(
      `${API_BASE}/${encodeURIComponent(geminiModel())}:generateContent?key=${encodeURIComponent(key)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text || "").join("").trim();
    return text || null;
  } catch {
    return null;
  }
}
