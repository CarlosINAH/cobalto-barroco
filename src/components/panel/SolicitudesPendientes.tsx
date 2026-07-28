"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Package } from "lucide-react";

interface Req {
  id: string;
  item: string;
  cantidad: string;
  nota: string;
  empleadoUsername: string;
  createdAt: number;
}

export default function SolicitudesPendientes({ initial }: { initial: Req[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, estado: "aprobado" | "rechazado") => {
    setBusy(id);
    try {
      await fetch(`/api/materials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  if (initial.length === 0) {
    return (
      <div className="bg-white border border-[#EDE9E0] py-10 text-center">
        <Package size={24} className="text-[#EDE9E0] mx-auto mb-2" />
        <p className="text-[#7A7A7A] text-sm">No hay solicitudes pendientes.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#EDE9E0]">
      {initial.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#EDE9E0] last:border-0"
        >
          <div className="min-w-0">
            <p className="text-[#2C2C2C] text-sm font-medium">
              {m.item} <span className="text-[#7A7A7A]">× {m.cantidad}</span>
            </p>
            <p className="text-[#7A7A7A] text-xs">
              Solicitado por @{m.empleadoUsername}
              {m.nota ? ` · ${m.nota}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => act(m.id, "aprobado")}
              disabled={busy === m.id}
              className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === m.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Aprobar
            </button>
            <button
              onClick={() => act(m.id, "rechazado")}
              disabled={busy === m.id}
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
