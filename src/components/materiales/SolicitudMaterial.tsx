"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Package, Loader2, X, Clock, CheckCircle2, XCircle } from "lucide-react";

interface Req {
  id: string;
  item: string;
  cantidad: string;
  nota: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  createdAt: number;
  empleadoUsername: string;
}

const estadoUI: Record<string, { c: string; icon: React.ElementType; t: string }> = {
  pendiente: { c: "text-amber-600 bg-amber-50 border-amber-200", icon: Clock, t: "Pendiente" },
  aprobado: { c: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2, t: "Aprobado" },
  rechazado: { c: "text-red-600 bg-red-50 border-red-200", icon: XCircle, t: "Rechazado" },
};

function fmt(ms: number) {
  return new Date(ms).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SolicitudMaterial() {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/materials");
      const data = await res.json();
      if (res.ok) setItems(data.materials);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Pide materiales para tu trabajo; la administración los revisa y aprueba.
        </p>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470]"
        >
          <Plus size={13} /> Nueva solicitud
        </button>
      </div>

      <div className="bg-white border border-[#EDE9E0]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#7A7A7A] text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-[#7A7A7A] text-sm">
            <Package size={28} className="text-[#EDE9E0] mx-auto mb-3" />
            Aún no has hecho solicitudes.
          </div>
        ) : (
          items.map((m) => {
            const ui = estadoUI[m.estado];
            const Icon = ui.icon;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#EDE9E0] last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-[#2C2C2C] text-sm font-medium">
                    {m.item} <span className="text-[#7A7A7A]">× {m.cantidad}</span>
                  </p>
                  {m.nota && <p className="text-[#7A7A7A] text-xs">{m.nota}</p>}
                  <p className="text-[#7A7A7A] text-xs mt-0.5">{fmt(m.createdAt)}</p>
                </div>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border font-semibold shrink-0 ${ui.c}`}>
                  <Icon size={12} /> {ui.t}
                </span>
              </div>
            );
          })
        )}
      </div>

      {modal && <Modal onClose={() => setModal(false)} onDone={() => { setModal(false); load(); }} />}
    </>
  );
}

function Modal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [item, setItem] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, cantidad, nota }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "No se pudo enviar.");
      else onDone();
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
  const label = "block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
            Nueva solicitud de material
          </h3>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={label}>Material *</label>
            <input className={field} value={item} onChange={(e) => setItem(e.target.value)} placeholder="Pan de oro 22k" />
          </div>
          <div>
            <label className={label}>Cantidad</label>
            <input className={field} value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="10 láminas" />
          </div>
          <div>
            <label className={label}>Nota (opcional)</label>
            <textarea className={`${field} min-h-20`} value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
          {error && <div className="bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#EDE9E0]">
          <button onClick={onClose} className="px-4 py-2.5 text-xs tracking-widest uppercase font-semibold text-[#7A7A7A] hover:text-[#1B2A5E]">
            Cancelar
          </button>
          <button
            onClick={send}
            disabled={saving || !item.trim()}
            className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Enviar solicitud
          </button>
        </div>
      </div>
    </div>
  );
}
