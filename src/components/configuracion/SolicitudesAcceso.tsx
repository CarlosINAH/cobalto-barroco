"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, UserCheck, Mail } from "lucide-react";

export interface Solicitud {
  username: string;
  nombre?: string;
  email?: string;
  via?: "nas" | "google";
  solicitadoEn: number;
}

const PERFILES: { value: string; label: string }[] = [
  { value: "administracion", label: "Administrador" },
  { value: "superintendente", label: "Superintendente" },
  { value: "residente", label: "Residente" },
  { value: "restaurador", label: "Restaurador" },
];

/**
 * Solicitudes de acceso pendientes (personas que entraron con Google y no tienen
 * cuenta del NAS). El admin aprueba asignando un perfil, o rechaza. Al aprobar se
 * crea su ficha y en el próximo inicio de sesión ya entra sin trámite.
 */
export default function SolicitudesAcceso({ initial }: { initial: Solicitud[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [perfiles, setPerfiles] = useState<Record<string, string>>({});

  const act = async (
    s: Solicitud,
    estado: "aprobado" | "rechazado",
  ) => {
    if (estado === "rechazado" && !confirm(`¿Rechazar el acceso de ${s.nombre || s.username}?`))
      return;
    setBusy(s.username);
    try {
      await fetch("/api/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: s.username,
          estado,
          perfil: perfiles[s.username] || "restaurador",
        }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  if (initial.length === 0) {
    return (
      <div className="bg-white border border-[#EDE9E0] py-12 text-center">
        <UserCheck size={26} className="text-[#EDE9E0] mx-auto mb-2" />
        <p className="text-[#7A7A7A] text-sm">No hay solicitudes de acceso pendientes.</p>
        <p className="text-[#C0BDB8] text-xs mt-1">
          Cuando alguien entre con Google sin cuenta, aparecerá aquí para aprobarlo.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#EDE9E0]">
      {initial.map((s) => (
        <div
          key={s.username}
          className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-[#EDE9E0] last:border-0"
        >
          <div className="min-w-0">
            <p className="text-[#2C2C2C] text-sm font-medium flex items-center gap-2">
              {s.nombre || s.username}
              {s.via === "google" && (
                <span className="text-[10px] uppercase tracking-wider bg-[#F5F2EC] border border-[#EDE9E0] text-[#7A7A7A] px-1.5 py-0.5">
                  Google
                </span>
              )}
            </p>
            <p className="text-[#7A7A7A] text-xs flex items-center gap-1.5">
              <Mail size={11} /> {s.email || s.username}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={perfiles[s.username] || "restaurador"}
              onChange={(e) =>
                setPerfiles((p) => ({ ...p, [s.username]: e.target.value }))
              }
              disabled={busy === s.username}
              title="Perfil a asignar"
              className="border border-[#EDE9E0] bg-white text-[#2C2C2C] text-xs px-2 py-1.5 focus:outline-none focus:border-[#C9A84C]"
            >
              {PERFILES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => act(s, "aprobado")}
              disabled={busy === s.username}
              className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === s.username ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Aprobar
            </button>
            <button
              onClick={() => act(s, "rechazado")}
              disabled={busy === s.username}
              className="flex items-center gap-1 border border-[#EDE9E0] text-[#7A7A7A] px-3 py-1.5 text-xs font-semibold hover:text-red-500 hover:border-red-200 disabled:opacity-50"
            >
              <X size={12} /> Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
