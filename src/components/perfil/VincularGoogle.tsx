"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, Unlink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

/**
 * Tarjeta para vincular la cuenta de Google al perfil. Permite luego iniciar
 * sesión con Google. Solo aparece si la integración está habilitada (se detecta
 * en runtime vía /api/me). El vínculo real lo hace el flujo OAuth del servidor;
 * aquí solo se muestra el estado y el botón.
 */
export default function VincularGoogle() {
  const search = useSearchParams();
  const g = search.get("glink");
  const aviso: "ok" | "dupe" | "err" | null =
    g === "ok" || g === "dupe" || g === "err" ? g : null;
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [desvinculando, setDesvinculando] = useState(false);

  async function desvincular() {
    if (!window.confirm("¿Desvincular tu cuenta de Google? Ya no podrás iniciar sesión con ella hasta vincularla de nuevo.")) return;
    setDesvinculando(true);
    try {
      const r = await fetch("/api/auth/google/unlink", { method: "POST" });
      if (r.ok) setEmail(null);
    } finally {
      setDesvinculando(false);
    }
  }

  // Estado actual (habilitado + correo vinculado): fetch inline, setState solo
  // tras el await.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch("/api/me");
        const data = res.ok ? await res.json() : null;
        if (vivo && data) { setEnabled(!!data.googleEnabled); setEmail(data.googleEmail || null); }
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  if (loading || !enabled) return null;

  return (
    <div className="bg-white border border-[#EDE9E0] p-5 mt-6">
      <h3 className="text-[#1B2A5E] font-semibold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        Cuenta de Google
      </h3>
      <p className="text-sm text-[#7A7A7A] mb-4">
        Vincula tu cuenta de Google para poder iniciar sesión con ella.
      </p>

      {/* Solo se confirma "vinculada" si el estado real (email) lo respalda;
          si llegó glink=ok pero no hay correo, el vínculo no se guardó. */}
      {aviso === "ok" && email && (
        <p className="flex items-center gap-2 text-sm text-green-700 mb-3"><CheckCircle2 size={15} /> Cuenta vinculada correctamente.</p>
      )}
      {aviso === "ok" && !email && (
        <p className="flex items-center gap-2 text-sm text-amber-700 mb-3"><AlertCircle size={15} /> El vínculo no se guardó. Vuelve a intentarlo; si persiste, revisa que los datos de la plataforma se estén guardando.</p>
      )}
      {aviso === "err" && (
        <p className="flex items-center gap-2 text-sm text-red-600 mb-3"><AlertCircle size={15} /> No se pudo vincular (no se encontró tu cuenta). Intenta de nuevo.</p>
      )}
      {aviso === "dupe" && (
        <p className="flex items-center gap-2 text-sm text-red-600 mb-3"><AlertCircle size={15} /> Esa cuenta de Google ya está vinculada a otro usuario.</p>
      )}

      {email ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="flex items-center gap-2 text-sm text-[#2C2C2C]"><CheckCircle2 size={15} className="text-green-600" /> Vinculada: <span className="font-semibold">{email}</span></p>
          <div className="flex items-center gap-3">
            <a href="/api/auth/google/start?intent=link" className="text-xs text-[#7A7A7A] hover:text-[#1B2A5E] underline">Cambiar cuenta</a>
            <button onClick={desvincular} disabled={desvinculando}
              className="inline-flex items-center gap-1.5 text-xs text-red-600 border border-[#EDE9E0] px-2.5 py-1 hover:border-red-300 disabled:opacity-60">
              {desvinculando ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />} Desvincular
            </button>
          </div>
        </div>
      ) : (
        <a href="/api/auth/google/start?intent=link"
          className="inline-flex items-center gap-2 border border-[#EDE9E0] px-4 py-2 text-sm text-[#1B2A5E] hover:border-[#C9A84C]">
          <Link2 size={15} className="text-[#C9A84C]" /> Vincular con Google
        </a>
      )}
    </div>
  );
}
