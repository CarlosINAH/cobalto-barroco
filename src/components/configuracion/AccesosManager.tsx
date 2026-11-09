"use client";

import { Fragment, useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, Eye, Pencil, FolderKanban, HardDrive } from "lucide-react";
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
  { id: "cv", label: "Currículum" },
];

// Qué puede hacer cada perfil con los archivos del NAS. Es informativo: se
// decide por el perfil (acción global de subir/descargar/borrar), no por carpeta.
const JERARQUIA_ARCHIVOS: { perfil: string; permisos: string }[] = [
  { perfil: "Administración", permisos: "Ver · Subir · Crear carpetas · Borrar de verdad (papelera y vaciar)" },
  { perfil: "Superintendente", permisos: "Ver · Subir · Crear carpetas · Mandar a papelera" },
  { perfil: "Residente", permisos: "Ver · Subir · Crear carpetas · Mandar a papelera" },
  { perfil: "Restaurador", permisos: "Ver · Subir · Mandar a papelera" },
];

const INPUT = "border border-[#EDE9E0] bg-white px-2 py-1.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";

export default function AccesosManager({
  initial, projects = [],
}: {
  initial: Employee[];
  projects?: { id: string; nombre: string }[];
}) {
  const [items, setItems] = useState<Employee[]>(initial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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
  // Asignación de proyectos por persona (👁 ver = participante, ✎ editar).
  const ve = (e: Employee, pid: string) => (e.proyectoIds || []).includes(pid);
  const edita = (e: Employee, pid: string) => (e.proyectoEdita || []).includes(pid);
  function toggleVer(e: Employee, pid: string) {
    const ids = ve(e, pid) ? (e.proyectoIds || []).filter((x) => x !== pid) : [...(e.proyectoIds || []), pid];
    const ed = ve(e, pid) ? (e.proyectoEdita || []).filter((x) => x !== pid) : e.proyectoEdita || [];
    save(e.id, { proyectoIds: ids, proyectoEdita: ed });
  }
  function toggleEdita(e: Employee, pid: string) {
    if (edita(e, pid)) {
      save(e.id, { proyectoEdita: (e.proyectoEdita || []).filter((x) => x !== pid) });
    } else {
      // Editar implica ver: asegura participación.
      const ids = ve(e, pid) ? (e.proyectoIds || []) : [...(e.proyectoIds || []), pid];
      save(e.id, { proyectoIds: ids, proyectoEdita: [...(e.proyectoEdita || []), pid] });
    }
  }
  const proyectosAsignados = (e: Employee) => (e.proyectoIds || []).length;

  return (
    <div className="space-y-5">
      {/* Leyenda: qué puede hacer cada perfil con los archivos del NAS */}
      <div className="bg-white border border-[#EDE9E0] p-5">
        <div className="flex items-center gap-2 mb-1 text-[#1B2A5E]">
          <HardDrive size={16} className="text-[#C9A84C]" />
          <h3 className="font-semibold">Permisos de Archivos (según el perfil)</h3>
        </div>
        <p className="text-[#7A7A7A] text-xs mb-3">
          Los empleados ven y suben a la carpeta <strong>compartido</strong> de sus
          proyectos. Lo que cambia es crear carpetas y borrar: lo decide el{" "}
          <strong>perfil</strong> de cada persona.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[#F5F2EC]">
              {JERARQUIA_ARCHIVOS.map((r) => (
                <tr key={r.perfil}>
                  <td className="px-2 py-1.5 font-semibold text-[#1B2A5E] whitespace-nowrap">{r.perfil}</td>
                  <td className="px-2 py-1.5 text-[#7A7A7A]">{r.permisos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accesos por persona: perfil, secciones sensibles y proyectos */}
      <div className="bg-white border border-[#EDE9E0] p-5">
        <div className="flex items-center gap-2 mb-1 text-[#1B2A5E]">
          <ShieldCheck size={16} className="text-[#C9A84C]" />
          <h3 className="font-semibold">Accesos por persona</h3>
        </div>
        <p className="text-[#7A7A7A] text-xs mb-4">
          Define el perfil de cada quien (que fija sus permisos de Archivos), a qué
          secciones sensibles entra (oculto, solo lectura o total) y en qué
          proyectos participa o puede editar. Los administradores siempre tienen acceso total.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
                <th className="px-2 py-2 font-semibold">Persona</th>
                <th className="px-2 py-2 font-semibold">Perfil</th>
                {SECCIONES.map((s) => <th key={s.id} className="px-2 py-2 font-semibold">{s.label}</th>)}
                <th className="px-2 py-2 font-semibold text-center">Proyectos</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const abierto = openId === e.id;
                return (
                  <Fragment key={e.id}>
                    <tr className="border-b border-[#F5F2EC]">
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
                        <button onClick={() => setOpenId(abierto ? null : e.id)}
                          className="inline-flex items-center gap-1 border border-[#EDE9E0] px-2 py-1 text-xs text-[#1B2A5E] hover:border-[#C9A84C]">
                          <FolderKanban size={13} /> {proyectosAsignados(e)}/{projects.length}
                          {abierto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="bg-[#F5F2EC]/40">
                        <td colSpan={SECCIONES.length + 3} className="px-4 py-3">
                          <p className="text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold mb-2 flex items-center gap-1.5"><FolderKanban size={13} className="text-[#C9A84C]" /> Proyectos</p>
                          {projects.length === 0 ? (
                            <p className="text-xs text-[#7A7A7A]">Aún no hay proyectos.</p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {projects.map((pr) => {
                                const puedeVer = ve(e, pr.id), puedeEditar = edita(e, pr.id);
                                return (
                                  <div key={pr.id} className="flex items-center justify-between gap-2 bg-white border border-[#EDE9E0] px-3 py-2">
                                    <span className="text-sm text-[#2C2C2C] truncate" title={pr.nombre}>{pr.nombre}</span>
                                    <span className="flex items-center gap-1 shrink-0">
                                      <button onClick={() => toggleVer(e, pr.id)} title={puedeVer ? "Visible — clic para ocultar" : "Oculto — clic para mostrar"}
                                        className={`p-1 border ${puedeVer ? "bg-[#1B2A5E] text-[#F5F2EC] border-[#1B2A5E]" : "bg-white text-[#7A7A7A] border-[#EDE9E0] hover:border-[#C9A84C]"}`}><Eye size={13} /></button>
                                      <button onClick={() => toggleEdita(e, pr.id)} title={puedeEditar ? "Puede editar — clic para solo lectura" : "Solo lectura — clic para permitir editar"}
                                        className={`p-1 border ${puedeEditar ? "bg-[#C9A84C] text-white border-[#C9A84C]" : "bg-white text-[#7A7A7A] border-[#EDE9E0] hover:border-[#C9A84C]"}`}><Pencil size={13} /></button>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={SECCIONES.length + 3} className="px-2 py-10 text-center text-[#7A7A7A]">Sin personal registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
