"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { Employee, PerfilSistema, AccesoNivel, SeccionSistema } from "@/lib/db";

const PERFILES: { id: PerfilSistema; label: string }[] = [
  { id: "administracion", label: "Administración" },
  { id: "superintendente", label: "Superintendente" },
  { id: "residente", label: "Residente" },
  { id: "restaurador", label: "Restaurador" },
];
const NIVELES: { id: AccesoNivel; label: string }[] = [
  { id: "oculto", label: "Oculto" },
  { id: "lectura", label: "Lectura" },
  { id: "total", label: "Total" },
];
const SECCIONES: { id: SeccionSistema; label: string }[] = [
  { id: "administracion", label: "Administración" },
  { id: "proyectos", label: "Proyectos / Presupuesto" },
];

const INPUT = "border border-[#EDE9E0] bg-white px-2 py-1.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";

export default function AccesosManager({ initial }: { initial: Employee[] }) {
  const [items, setItems] = useState<Employee[]>(initial);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function save(id: string, patch: Partial<Employee>) {
    setSavingId(id);
    setItems((xs) => xs.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    try {
      await fetch(`/api/employees/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } finally {
      setSavingId(null);
    }
  }
  function setNivel(e: Employee, sec: SeccionSistema, nivel: AccesoNivel) {
    const acceso = { ...(e.acceso || {}), [sec]: nivel };
    save(e.id, { acceso });
  }

  return (
    <div className="bg-white border border-[#EDE9E0] p-5">
      <div className="flex items-center gap-2 mb-1 text-[#1B2A5E]">
        <ShieldCheck size={16} className="text-[#C9A84C]" />
        <h3 className="font-semibold">Accesos por persona</h3>
      </div>
      <p className="text-[#7A7A7A] text-xs mb-4">
        Define el perfil de cada quien y a qué secciones sensibles entra, y con
        qué nivel (oculto, solo lectura o total). Los administradores siempre
        tienen acceso total.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-2 py-2 font-semibold">Persona</th>
              <th className="px-2 py-2 font-semibold">Perfil</th>
              {SECCIONES.map((s) => <th key={s.id} className="px-2 py-2 font-semibold">{s.label}</th>)}
              <th className="px-2 py-2 font-semibold text-center">Papelera</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b border-[#F5F2EC]">
                <td className="px-2 py-2 text-[#2C2C2C]">
                  {e.nombre}
                  {savingId === e.id && <span className="ml-2 text-[11px] text-[#7A7A7A]">guardando…</span>}
                </td>
                <td className="px-2 py-2">
                  <select className={INPUT} value={e.perfil || ""} onChange={(ev) => save(e.id, { perfil: (ev.target.value || undefined) as PerfilSistema | undefined })}>
                    <option value="">— sin perfil —</option>
                    {PERFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </td>
                {SECCIONES.map((s) => (
                  <td key={s.id} className="px-2 py-2">
                    <select className={INPUT} value={e.acceso?.[s.id] || "oculto"} onChange={(ev) => setNivel(e, s.id, ev.target.value as AccesoNivel)}>
                      {NIVELES.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                    </select>
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <input type="checkbox" checked={e.papeleraBorrar === true} onChange={(ev) => save(e.id, { papeleraBorrar: ev.target.checked })} />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={SECCIONES.length + 3} className="px-2 py-10 text-center text-[#7A7A7A]">Sin personal registrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
