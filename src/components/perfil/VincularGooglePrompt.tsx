"use client";

import { useEffect, useState } from "react";
import { Link2, X } from "lucide-react";

const SEEN_KEY = "cb-gprompt-seen";

function yaVisto(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function marcarVisto() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* sessionStorage no disponible: no pasa nada */
  }
}

/**
 * Aviso que se muestra UNA vez al inicio de la sesión a quien aún no ha
 * vinculado su cuenta de Google, invitándolo a hacerlo. Así el equipo migra a
 * iniciar sesión con Google y se dejan de usar las cuentas del NAS. No aparece
 * si Google no está configurado, si la persona ya vinculó, o si ya se mostró en
 * esta sesión. El vínculo real lo hace el flujo OAuth del servidor.
 */
export default function VincularGooglePrompt() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (yaVisto()) return;
      try {
        const res = await fetch("/api/me");
        const d = res.ok ? await res.json() : null;
        if (!vivo || !d) return;
        // Solo si la integración está activa y la persona NO ha vinculado.
        if (d.googleEnabled && !d.googleEmail) {
          setAbierto(true);
          marcarVisto();
        }
      } catch {
        /* sin conexión: no molestamos */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAbierto(false)}>
      <div className="bg-white border border-[#EDE9E0] w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE9E0]">
          <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
            Vincula tu cuenta de Google
          </h3>
          <button onClick={() => setAbierto(false)} className="text-[#7A7A7A] hover:text-[#1B2A5E]" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-[#2C2C2C] mb-2">
            Vincula tu cuenta de Google para iniciar sesión con tu correo, sin depender de la contraseña del NAS.
          </p>
          <p className="text-xs text-[#7A7A7A]">
            Es un paso de una sola vez. Después entrarás a la plataforma directo con Google.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#EDE9E0]">
          <button onClick={() => setAbierto(false)} className="px-4 py-2 text-xs uppercase font-semibold text-[#7A7A7A] hover:text-[#1B2A5E]">
            Ahora no
          </button>
          <a href="/api/auth/google/start?intent=link"
            className="inline-flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470]">
            <Link2 size={14} className="text-[#C9A84C]" /> Vincular con Google
          </a>
        </div>
      </div>
    </div>
  );
}
