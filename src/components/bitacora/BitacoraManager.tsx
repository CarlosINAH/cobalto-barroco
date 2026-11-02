"use client";

import { useMemo, useState } from "react";
import { Search, History, User } from "lucide-react";

export interface MovRow {
  id: string;
  ts: number;
  actor: string;
  actorNombre?: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  descripcion?: string;
  projectId?: string | null;
  proyectoNombre: string;
}

const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";

const ACCION_CLS: Record<string, string> = {
  crear: "bg-green-50 text-green-700 border-green-200",
  editar: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20",
  borrar: "bg-red-50 text-red-600 border-red-200",
};

function fechaHora(ts: number): string {
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Bitácora de movimientos: tabla filtrable de "quién hizo qué y cuándo".
 * Filtra en cliente sobre lo que el servidor ya entregó (lo más reciente).
 */
export default function BitacoraManager({ movimientos }: { movimientos: MovRow[] }) {
  const [q, setQ] = useState("");
  const [entidad, setEntidad] = useState("");
  const [actor, setActor] = useState("");

  const entidades = useMemo(() => [...new Set(movimientos.map((m) => m.entidad))].sort(), [movimientos]);
  const actores = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of movimientos) map.set(m.actor, m.actorNombre || m.actor);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [movimientos]);

  const texto = q.trim().toLowerCase();
  const filtrados = movimientos.filter((m) => {
    if (entidad && m.entidad !== entidad) return false;
    if (actor && m.actor !== actor) return false;
    if (texto) {
      const blob = `${m.actorNombre || ""} ${m.actor} ${m.accion} ${m.entidad} ${m.descripcion || ""} ${m.proyectoNombre}`.toLowerCase();
      if (!blob.includes(texto)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la bitácora…" className={INPUT + " pl-9"} />
        </div>
        <select value={entidad} onChange={(e) => setEntidad(e.target.value)} className={INPUT + " w-auto capitalize"}>
          <option value="">Todas las entidades</option>
          {entidades.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select value={actor} onChange={(e) => setActor(e.target.value)} className={INPUT + " w-auto"}>
          <option value="">Todos los usuarios</option>
          {actores.map(([u, n]) => <option key={u} value={u}>{n}</option>)}
        </select>
        <span className="text-sm text-[#7A7A7A]">{filtrados.length} movimientos</span>
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white border border-[#EDE9E0] p-10 text-center">
          <History size={26} className="mx-auto text-[#C9A84C] mb-3" />
          <p className="text-sm text-[#7A7A7A]">No hay movimientos que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#EDE9E0] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EDE9E0] text-left text-[11px] uppercase tracking-wider text-[#7A7A7A]">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Usuario</th>
                <th className="px-3 py-2 font-semibold">Acción</th>
                <th className="px-3 py-2 font-semibold">Entidad</th>
                <th className="px-3 py-2 font-semibold">Detalle</th>
                <th className="px-3 py-2 font-semibold">Proyecto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EC]">
              {filtrados.map((m) => (
                <tr key={m.id} className="hover:bg-[#F5F2EC]/50 align-top">
                  <td className="px-3 py-2 text-[#7A7A7A] whitespace-nowrap data-label">{fechaHora(m.ts)}</td>
                  <td className="px-3 py-2 text-[#2C2C2C] whitespace-nowrap"><span className="inline-flex items-center gap-1"><User size={12} className="text-[#C9A84C]" />{m.actorNombre || m.actor}</span></td>
                  <td className="px-3 py-2">
                    <span className={`text-[11px] px-2 py-0.5 border capitalize ${ACCION_CLS[m.accion] || "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]"}`}>{m.accion}</span>
                  </td>
                  <td className="px-3 py-2 text-[#555] capitalize">{m.entidad}</td>
                  <td className="px-3 py-2 text-[#555]">{m.descripcion || "—"}</td>
                  <td className="px-3 py-2 text-[#555]">{m.proyectoNombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
