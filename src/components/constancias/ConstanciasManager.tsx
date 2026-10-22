"use client";

import { useState } from "react";
import { FileText, Download } from "lucide-react";

interface EmpleadoLite {
  id: string;
  nombre: string;
}
interface ProyectoLite {
  id: string;
  nombre: string;
  ubicacion: string;
  inicio: string;
  entrega: string;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-01-15" → "enero 2026". */
function mesAnio(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})/);
  if (!m) return "";
  const mes = MESES[Number(m[2]) - 1] ?? "";
  return mes ? `${mes} ${m[1]}` : "";
}
function periodoDe(inicio: string, entrega: string): string {
  const a = mesAnio(inicio);
  const b = mesAnio(entrega);
  if (a && b) return `${a} a ${b}`;
  return a || b || "";
}

const INPUT =
  "w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";
const BTN_PRIMARY =
  "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";

export default function ConstanciasManager({
  empleados,
  proyectos,
  firmanteDefault,
}: {
  empleados: EmpleadoLite[];
  proyectos: ProyectoLite[];
  firmanteDefault: string;
}) {
  const hoy = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const [f, setF] = useState({
    participante: "",
    proyecto: "",
    ubicacion: "",
    periodo: "",
    firmanteNombre: firmanteDefault,
    firmanteCargo: "Dirección",
    fecha: hoy,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pickEmpleado(id: string) {
    const e = empleados.find((x) => x.id === id);
    if (e) setF((s) => ({ ...s, participante: e.nombre }));
  }
  function pickProyecto(id: string) {
    const p = proyectos.find((x) => x.id === id);
    if (p) setF((s) => ({ ...s, proyecto: p.nombre, ubicacion: p.ubicacion, periodo: periodoDe(p.inicio, p.entrega) }));
  }

  async function generar() {
    if (!f.participante.trim()) { setError("Elige o escribe el participante."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/constancias/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) { setError("No se pudo generar el PDF."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError("No se pudo generar el PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulario */}
      <div className="bg-white border border-[#EDE9E0] p-6">
        <h2 className="text-[#1B2A5E] text-lg mb-4" style={{ fontFamily: "var(--font-playfair)" }}>Emitir constancia de trabajo</h2>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Empleado</label>
              <select className={INPUT} defaultValue="" onChange={(e) => pickEmpleado(e.target.value)}>
                <option value="">Elegir…</option>
                {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Proyecto</label>
              <select className={INPUT} defaultValue="" onChange={(e) => pickProyecto(e.target.value)}>
                <option value="">Elegir…</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL}>Participante (como aparecerá)</label>
            <input className={INPUT} value={f.participante} onChange={(e) => setF({ ...f, participante: e.target.value })} placeholder="Nombre completo" />
          </div>
          <div>
            <label className={LABEL}>Proyecto</label>
            <input className={INPUT} value={f.proyecto} onChange={(e) => setF({ ...f, proyecto: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Ubicación</label>
              <input className={INPUT} value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Periodo</label>
              <input className={INPUT} value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })} placeholder="enero 2026 a junio 2026" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Firma — Nombre</label>
              <input className={INPUT} value={f.firmanteNombre} onChange={(e) => setF({ ...f, firmanteNombre: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Firma — Cargo</label>
              <input className={INPUT} value={f.firmanteCargo} onChange={(e) => setF({ ...f, firmanteCargo: e.target.value })} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <button onClick={generar} disabled={busy} className={BTN_PRIMARY}>
              <Download size={14} /> {busy ? "Generando…" : "Generar PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* Vista previa del texto */}
      <div className="bg-white border border-[#EDE9E0] p-8 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-[#C9A84C] mb-4">
          <FileText size={16} />
          <span className="data-label text-xs uppercase tracking-widest">Vista previa</span>
        </div>
        <h3 className="text-[#1B2A5E] tracking-[0.2em] text-sm font-bold" style={{ fontFamily: "var(--font-playfair)" }}>CONSTANCIA DE TRABAJO</h3>
        <p className="text-xs text-[#7A7A7A] mb-6">Restauración Artística &amp; Arquitectónica</p>
        <p className="text-sm text-[#2C2C2C]">Por medio de la presente, Cobalto Barroco hace constar que:</p>
        <p className="text-lg text-[#1B2A5E] font-semibold my-2" style={{ fontFamily: "var(--font-playfair)" }}>{f.participante || "[Participante]"}</p>
        <p className="text-sm text-[#2C2C2C]">Participó en los trabajos correspondientes al proyecto:</p>
        <p className="text-base text-[#1B2A5E] font-semibold my-2">{f.proyecto || "[Proyecto]"}</p>
        {f.ubicacion && <p className="text-sm text-[#2C2C2C]">Ubicación: {f.ubicacion}</p>}
        {f.periodo && <p className="text-sm text-[#2C2C2C]">Periodo: {f.periodo}</p>}
        <p className="text-xs text-[#7A7A7A] mt-6 max-w-sm">Se expide la presente constancia para los fines que a la persona interesada convengan.</p>
        <div className="mt-8 pt-2 border-t border-[#EDE9E0] w-56">
          <p className="text-sm text-[#1B2A5E] font-semibold">{f.firmanteNombre || "[Nombre y firma]"}</p>
          <p className="text-xs text-[#7A7A7A]">{f.firmanteCargo || "[Cargo]"}</p>
        </div>
      </div>
    </div>
  );
}
