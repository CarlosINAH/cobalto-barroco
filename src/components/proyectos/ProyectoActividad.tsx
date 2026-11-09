"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type Mov = {
  id: string;
  ts: number;
  actor: string;
  actorNombre: string;
  accion: string;
  entidad: string;
  descripcion?: string;
};

function iniciales(nombre: string): string {
  return (nombre || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fecha(ts: number): string {
  try {
    return new Date(ts).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Feed de actividad de un proyecto (quién hizo qué y cuándo), estilo panel de
 * actividad. Lee la bitácora acotada a este proyecto.
 */
export default function ProyectoActividad({ projectId }: { projectId: string }) {
  const [movs, setMovs] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`/api/bitacora?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setMovs(d?.movimientos ?? []);
        setError("");
      })
      .catch(() => {
        if (alive) setError("No se pudo cargar la actividad.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId, reload]);

  function refrescar() {
    setLoading(true);
    setReload((n) => n + 1);
  }

  return (
    <div className="bg-white border border-[#EDE9E0] p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] text-[#7A7A7A] uppercase tracking-wider font-semibold">Movimientos recientes</span>
        <button onClick={refrescar} className="text-[#7A7A7A] hover:text-[#1B2A5E] p-1 flex items-center gap-1 text-xs" title="Actualizar">
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[#7A7A7A] flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Cargando…
        </p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : movs.length === 0 ? (
        <p className="text-sm text-[#7A7A7A]">
          Sin movimientos registrados en este proyecto todavía. Aquí verás quién hace cambios (presupuesto, administración, nómina, etc.).
        </p>
      ) : (
        <ul className="divide-y divide-[#F5F2EC]">
          {movs.map((m) => (
            <li key={m.id} className="py-2.5 flex items-start gap-3">
              <span className="w-8 h-8 shrink-0 bg-[#1B2A5E] flex items-center justify-center text-[#C9A84C] text-[11px] font-bold">
                {iniciales(m.actorNombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#2C2C2C]">
                  <span className="font-semibold text-[#1B2A5E]">{m.actorNombre}</span>{" "}
                  {m.descripcion || `${m.accion} · ${m.entidad}`}
                </p>
                <p className="text-[11px] text-[#7A7A7A] data-label">{fecha(m.ts)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
