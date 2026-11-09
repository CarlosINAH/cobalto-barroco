"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, CheckCircle2, CalendarClock } from "lucide-react";

type Status = { enabled: boolean; connected: boolean; email: string | null };

/**
 * Panel de conexión de la cuenta de Google de la empresa, para que el Calendario
 * pueda crear eventos e invitar por correo. Solo admin. Si Google no está
 * configurado en el entorno, no se muestra nada.
 */
export default function GoogleCalendarConexion() {
  const [st, setSt] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState("");

  // Recarga el estado (para el botón Desconectar). En manejadores de evento sí
  // se puede llamar setState directo.
  async function cargar() {
    try {
      const r = await fetch("/api/drive/status");
      setSt(r.ok ? await r.json() : null);
    } catch {
      setSt(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    // Mensaje tras volver del flujo de conexión de Google (lectura síncrona, sin setState).
    let dmsg = "";
    try {
      const p = new URLSearchParams(window.location.search).get("dconn");
      if (p === "ok") dmsg = "Cuenta de Google conectada.";
      else if (p === "norefresh")
        dmsg =
          "Google no devolvió el permiso completo. Desconéctala y vuelve a conectarla aceptando todos los accesos.";
    } catch {
      /* sin window */
    }
    // El estado se fija dentro de las callbacks del fetch (asíncronas).
    fetch("/api/drive/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setSt(d);
        if (dmsg) setAviso(dmsg);
      })
      .catch(() => {
        if (alive) setSt(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function desconectar() {
    if (
      !window.confirm(
        "¿Desconectar la cuenta de Google? El calendario dejará de crear eventos e invitar.",
      )
    )
      return;
    setBusy(true);
    await fetch("/api/drive/disconnect", { method: "POST" }).catch(() => {});
    setBusy(false);
    cargar();
  }

  // Sin Google configurado en el entorno, o cargando: no se muestra el panel.
  if (loading || !st?.enabled) return null;

  return (
    <div className="bg-white border border-[#EDE9E0] p-4 mb-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex h-9 w-9 items-center justify-center bg-[#1B2A5E]/5 text-[#C9A84C] shrink-0">
            <CalendarClock size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[#1B2A5E] font-semibold text-sm">Google para el Calendario</h3>
            {st.connected ? (
              <p className="flex items-center gap-1.5 text-xs text-[#7A7A7A] mt-0.5">
                <CheckCircle2 size={13} className="text-green-600" />
                Conectado{st.email ? ` · ${st.email}` : ""} — el calendario puede crear eventos e invitar.
              </p>
            ) : (
              <p className="text-xs text-[#7A7A7A] mt-0.5">
                Conéctala para que el calendario envíe invitaciones por correo.
              </p>
            )}
            {aviso && <p className="text-xs text-[#1B2A5E] mt-1">{aviso}</p>}
          </div>
        </div>
        <div className="shrink-0">
          {st.connected ? (
            <button
              onClick={desconectar}
              disabled={busy}
              className="flex items-center gap-1.5 border border-[#EDE9E0] text-[#7A7A7A] px-3 py-1.5 text-xs uppercase tracking-wider font-semibold hover:text-red-600 hover:border-red-200 disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : null} Desconectar
            </button>
          ) : (
            <a
              href="/api/auth/google/start?intent=drive"
              className="flex items-center gap-1.5 bg-[#1B2A5E] text-[#F5F2EC] px-3 py-1.5 text-xs uppercase tracking-wider font-semibold hover:bg-[#243470]"
            >
              <Link2 size={14} /> Conectar Google
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
