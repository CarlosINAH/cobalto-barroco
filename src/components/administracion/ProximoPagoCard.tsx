"use client";

import { useState } from "react";
import { CalendarClock, Save, Pencil, X, Loader2 } from "lucide-react";
import type { ProximoPago } from "@/lib/db";

const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";

/** "2026-11-15" → "15 de noviembre de 2026". */
function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Tarjeta de la próxima fecha de pago de nómina. Si `canEdit`, la administración
 * la fija; en otro caso solo la muestra (vista del empleado en "Mi nómina").
 */
export default function ProximoPagoCard({ inicial, canEdit = false }: { inicial: ProximoPago | null; canEdit?: boolean }) {
  const [pago, setPago] = useState<ProximoPago | null>(inicial);
  const [edit, setEdit] = useState(false);
  const [fecha, setFecha] = useState(inicial?.fecha || "");
  const [nota, setNota] = useState(inicial?.nota || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/config/proximo-pago", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, nota }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No se pudo guardar."); return; }
      setPago(data.proximoPago);
      setEdit(false);
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-[#EDE9E0] p-5 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center bg-[#1B2A5E]/5 text-[#C9A84C]"><CalendarClock size={18} /></span>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#7A7A7A]">Próxima fecha de pago</p>
            {pago?.fecha ? (
              <>
                <p className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>{fechaLarga(pago.fecha)}</p>
                {pago.nota && <p className="text-sm text-[#555] mt-0.5">{pago.nota}</p>}
              </>
            ) : (
              <p className="text-sm text-[#7A7A7A] mt-0.5">Sin fecha definida{canEdit ? " — configúrala aquí." : "."}</p>
            )}
          </div>
        </div>
        {canEdit && !edit && (
          <button onClick={() => { setFecha(pago?.fecha || ""); setNota(pago?.nota || ""); setEdit(true); }}
            className="flex items-center gap-1 text-xs text-[#7A7A7A] hover:text-[#1B2A5E] border border-[#EDE9E0] px-2 py-1 hover:border-[#C9A84C] shrink-0">
            <Pencil size={12} /> {pago?.fecha ? "Cambiar" : "Definir"}
          </button>
        )}
      </div>

      {canEdit && edit && (
        <div className="mt-4 pt-4 border-t border-[#EDE9E0] grid gap-3 sm:grid-cols-2">
          <div><label className={LABEL}>Fecha</label><input type="date" className={INPUT} value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div><label className={LABEL}>Nota (opcional)</label><input className={INPUT} placeholder="Quincena del 15" value={nota} onChange={(e) => setNota(e.target.value)} /></div>
          {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={guardar} disabled={busy} className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
            </button>
            <button onClick={() => { setEdit(false); setError(""); }} className="flex items-center gap-1 px-4 py-2 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={13} /> Cancelar</button>
            {fecha && <button onClick={() => { setFecha(""); setNota(""); }} className="ml-auto text-xs text-[#7A7A7A] hover:text-red-600 underline">Borrar fecha</button>}
          </div>
        </div>
      )}
    </div>
  );
}
