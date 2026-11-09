"use client";

import { useState } from "react";
import {
  ShieldCheck, ChevronDown, ChevronUp, Eye, Pencil, FolderKanban,
  Crown, Mail, HardDrive, Layers, CheckCircle2,
} from "lucide-react";
import type { Employee, AccesoNivel, SeccionSistema } from "@/lib/db";

const NIVELES: { id: AccesoNivel; label: string }[] = [
  { id: "oculto", label: "Oculto" },
  { id: "lectura", label: "Lectura" },
  { id: "total", label: "Total" },
];
const SECCIONES: { id: SeccionSistema; label: string; hint: string }[] = [
  { id: "administracion", label: "Administración", hint: "Costos, gastos, nómina" },
  { id: "proyectos", label: "Proyectos / Presupuesto", hint: "Obras y presupuestos" },
  { id: "cv", label: "Currículum", hint: "Experiencia de la empresa" },
];
// Atajos: fijan las tres secciones de un golpe (sin exponer "perfiles").
const PRESETS: { label: string; valores: Partial<Record<SeccionSistema, AccesoNivel>> }[] = [
  { label: "Solo su panel", valores: { administracion: "oculto", proyectos: "oculto", cv: "oculto" } },
  { label: "Ver proyectos", valores: { administracion: "oculto", proyectos: "total", cv: "lectura" } },
  { label: "Acceso total", valores: { administracion: "total", proyectos: "total", cv: "total" } },
];

function iniciales(nombre: string): string {
  return (nombre || "?").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

/** Selector segmentado Oculto · Lectura · Total, con color según el nivel. */
function NivelSeg({ value, onChange }: { value: AccesoNivel; onChange: (n: AccesoNivel) => void }) {
  const activo: Record<AccesoNivel, string> = {
    oculto: "bg-[#EDE9E0] text-[#7A7A7A] border-[#EDE9E0]",
    lectura: "bg-[#1B2A5E] text-[#F5F2EC] border-[#1B2A5E]",
    total: "bg-[#C9A84C] text-white border-[#C9A84C]",
  };
  return (
    <div className="inline-flex border border-[#EDE9E0] overflow-hidden">
      {NIVELES.map((n) => {
        const on = value === n.id;
        return (
          <button key={n.id} type="button" onClick={() => onChange(n.id)}
            className={`px-3 py-1.5 text-xs font-semibold border-r last:border-r-0 transition-colors ${on ? activo[n.id] : "bg-white text-[#7A7A7A] border-[#EDE9E0] hover:text-[#1B2A5E]"}`}>
            {n.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Panel de accesos (solo admin). Hace DOS cosas, nada más:
 *   1) Qué secciones de la plataforma ve cada persona (oculto / lectura / total).
 *   2) En qué proyectos participa o puede editar.
 * Los archivos NO se controlan aquí: se deciden por la asignación de proyectos
 * (cada empleado ve la carpeta "compartido" de sus proyectos). El rol de
 * administrador se fija en el servidor (ADMIN_USERS), no en este panel.
 */
export default function AccesosManager({
  initial, projects = [], adminUsernames = [],
}: {
  initial: Employee[];
  projects?: { id: string; nombre: string }[];
  adminUsernames?: string[];
}) {
  const [items, setItems] = useState<Employee[]>(initial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const admins = adminUsernames.map((a) => a.toLowerCase());
  const esAdmin = (e: Employee) => admins.includes((e.username || "").trim().toLowerCase());
  const tieneGoogle = (e: Employee) => !!(e.googleSub || e.googleEmail);

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
    save(e.id, { acceso: { ...(e.acceso || {}), [sec]: nivel } });
  }
  function aplicarPreset(e: Employee, valores: Partial<Record<SeccionSistema, AccesoNivel>>) {
    save(e.id, { acceso: { ...(e.acceso || {}), ...valores } });
  }

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
      const ids = ve(e, pid) ? (e.proyectoIds || []) : [...(e.proyectoIds || []), pid];
      save(e.id, { proyectoIds: ids, proyectoEdita: [...(e.proyectoEdita || []), pid] });
    }
  }

  // Admins primero, luego el resto por nombre.
  const ordenados = [...items].sort((a, b) => {
    const da = esAdmin(a) ? 0 : 1, db2 = esAdmin(b) ? 0 : 1;
    if (da !== db2) return da - db2;
    return (a.nombre || "").localeCompare(b.nombre || "");
  });

  return (
    <div className="space-y-5">
      {/* Qué hace este panel */}
      <div className="bg-white border border-[#EDE9E0] p-5">
        <div className="flex items-center gap-2 mb-2 text-[#1B2A5E]">
          <ShieldCheck size={16} className="text-[#C9A84C]" />
          <h3 className="font-semibold">Accesos de cada persona</h3>
        </div>
        <ul className="text-[#7A7A7A] text-sm space-y-1.5">
          <li className="flex items-start gap-2"><Layers size={14} className="text-[#C9A84C] mt-0.5 shrink-0" /> <span><strong className="text-[#2C2C2C]">Secciones:</strong> qué partes de la plataforma ve cada quien (oculto, solo lectura o total).</span></li>
          <li className="flex items-start gap-2"><FolderKanban size={14} className="text-[#C9A84C] mt-0.5 shrink-0" /> <span><strong className="text-[#2C2C2C]">Proyectos:</strong> en qué obras participa y cuáles puede editar. De ahí sale qué archivos ve (la carpeta <strong>compartido</strong> de sus proyectos).</span></li>
          <li className="flex items-start gap-2"><Crown size={14} className="text-[#C9A84C] mt-0.5 shrink-0" /> <span><strong className="text-[#2C2C2C]">Administradores:</strong> {admins.length ? "Floppy y Cobalto Barroco" : "los definidos en el servidor"} tienen acceso total y se configuran en el servidor, no aquí.</span></li>
          <li className="flex items-start gap-2"><Mail size={14} className="text-[#C9A84C] mt-0.5 shrink-0" /> <span>Cuando alguien <strong className="text-[#2C2C2C]">vincula su Google</strong>, entra con su correo y deja de necesitar cuenta del NAS.</span></li>
        </ul>
      </div>

      {ordenados.length === 0 && (
        <div className="bg-white border border-[#EDE9E0] p-10 text-center text-[#7A7A7A] text-sm">Sin personal registrado.</div>
      )}

      {/* Una tarjeta por persona */}
      <div className="space-y-3">
        {ordenados.map((e) => {
          const admin = esAdmin(e);
          const abierto = openId === e.id;
          const nProy = (e.proyectoIds || []).length;
          const inactivo = e.activo === false;
          return (
            <div key={e.id} className={`bg-white border p-4 sm:p-5 ${admin ? "border-[#C9A84C]/60" : "border-[#EDE9E0]"}`}>
              {/* Cabecera: identidad y cómo entra */}
              <div className="flex items-start gap-3">
                <span className={`w-10 h-10 shrink-0 flex items-center justify-center text-[12px] font-bold ${admin ? "bg-[#C9A84C] text-white" : "bg-[#1B2A5E] text-[#C9A84C]"}`}>
                  {iniciales(e.nombre)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-[#2C2C2C] font-semibold truncate">{e.nombre || e.username}</span>
                    {admin && (
                      <span className="inline-flex items-center gap-1 bg-[#C9A84C]/15 text-[#8A6D1F] text-[11px] font-semibold px-2 py-0.5"><Crown size={12} /> Administrador</span>
                    )}
                    {inactivo && (
                      <span className="inline-flex items-center gap-1 bg-[#F5F2EC] text-[#7A7A7A] text-[11px] font-semibold px-2 py-0.5">Inactivo</span>
                    )}
                    {savingId === e.id && <span className="text-[11px] text-[#7A7A7A]">guardando…</span>}
                  </div>
                  {/* Cómo inicia sesión */}
                  <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px]">
                    {tieneGoogle(e) ? (
                      <span className="inline-flex items-center gap-1 text-[#1B2A5E]"><CheckCircle2 size={12} className="text-[#C9A84C]" /> Google · <span className="text-[#7A7A7A]">{e.googleEmail || "vinculado"}</span></span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#7A7A7A]"><HardDrive size={12} /> NAS · {e.username || "—"} <span className="text-[#C0BDB8]">(sin Google)</span></span>
                    )}
                  </div>
                </div>
              </div>

              {admin ? (
                <p className="mt-3 text-xs text-[#7A7A7A]">Acceso total a todo. Para quitarle el rol, edita <code className="text-[#1B2A5E]">ADMIN_USERS</code> en el servidor.</p>
              ) : (
                <>
                  {/* Secciones */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <span className="text-[11px] uppercase tracking-wider text-[#1B2A5E] font-semibold flex items-center gap-1.5"><Layers size={13} className="text-[#C9A84C]" /> Secciones que ve</span>
                      <div className="flex items-center gap-1.5">
                        {PRESETS.map((p) => (
                          <button key={p.label} type="button" onClick={() => aplicarPreset(e, p.valores)}
                            className="text-[11px] text-[#7A7A7A] border border-[#EDE9E0] px-2 py-1 hover:border-[#C9A84C] hover:text-[#1B2A5E]">
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {SECCIONES.map((s) => (
                        <div key={s.id} className="border border-[#F0EDE5] p-2.5">
                          <p className="text-xs font-semibold text-[#2C2C2C]">{s.label}</p>
                          <p className="text-[10px] text-[#A8A399] mb-2">{s.hint}</p>
                          <NivelSeg value={e.acceso?.[s.id] || "oculto"} onChange={(n) => setNivel(e, s.id, n)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Proyectos */}
                  <div className="mt-4 border-t border-[#F5F2EC] pt-3">
                    <button onClick={() => setOpenId(abierto ? null : e.id)}
                      className="w-full flex items-center justify-between gap-2 text-left">
                      <span className="text-[11px] uppercase tracking-wider text-[#1B2A5E] font-semibold flex items-center gap-1.5"><FolderKanban size={13} className="text-[#C9A84C]" /> Proyectos asignados</span>
                      <span className="flex items-center gap-1 text-xs text-[#7A7A7A]">
                        {nProy} de {projects.length}
                        {abierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </button>
                    {abierto && (
                      projects.length === 0 ? (
                        <p className="mt-3 text-xs text-[#7A7A7A]">Aún no hay proyectos.</p>
                      ) : (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {projects.map((pr) => {
                            const puedeVer = ve(e, pr.id), puedeEditar = edita(e, pr.id);
                            return (
                              <div key={pr.id} className={`flex items-center justify-between gap-2 border px-3 py-2 ${puedeVer ? "border-[#C9A84C]/40 bg-[#C9A84C]/5" : "border-[#EDE9E0]"}`}>
                                <span className="text-sm text-[#2C2C2C] truncate" title={pr.nombre}>{pr.nombre}</span>
                                <span className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => toggleVer(e, pr.id)} title={puedeVer ? "Participa — clic para quitar" : "No participa — clic para asignar"}
                                    className={`p-1 border ${puedeVer ? "bg-[#1B2A5E] text-[#F5F2EC] border-[#1B2A5E]" : "bg-white text-[#7A7A7A] border-[#EDE9E0] hover:border-[#C9A84C]"}`}><Eye size={13} /></button>
                                  <button onClick={() => toggleEdita(e, pr.id)} title={puedeEditar ? "Puede editar — clic para solo lectura" : "Solo lectura — clic para permitir editar"}
                                    className={`p-1 border ${puedeEditar ? "bg-[#C9A84C] text-white border-[#C9A84C]" : "bg-white text-[#7A7A7A] border-[#EDE9E0] hover:border-[#C9A84C]"}`}><Pencil size={13} /></button>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
