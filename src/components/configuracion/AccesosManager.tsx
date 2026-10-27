"use client";

import { Fragment, useState } from "react";
import { ShieldCheck, FolderLock, ChevronDown, ChevronUp, Loader2, Check } from "lucide-react";
import type { Employee, PerfilSistema, AccesoNivel, SeccionSistema, FolderPermLevel } from "@/lib/db";
import type { FolderPerms } from "@/components/permisos/PermisosManager";

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

// Niveles de carpeta (mismo modelo que Permisos de carpetas).
const CARPETA_NIVELES: { id: FolderPermLevel; label: string }[] = [
  { id: "total", label: "Acceso total" },
  { id: "escritura", label: "Lectura y escritura" },
  { id: "lectura", label: "Solo lectura" },
  { id: "none", label: "Sin acceso" },
];

const INPUT = "border border-[#EDE9E0] bg-white px-2 py-1.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";

export default function AccesosManager({
  initial, folders, folderPerms,
}: {
  initial: Employee[];
  folders: { name: string; path: string }[];
  folderPerms: Record<string, FolderPerms>;
}) {
  const [items, setItems] = useState<Employee[]>(initial);
  const [perms, setPerms] = useState<Record<string, FolderPerms>>(folderPerms);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingCarpeta, setSavingCarpeta] = useState<string | null>(null); // "username|path"
  const [guardadoCarpeta, setGuardadoCarpeta] = useState<string | null>(null);

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

  // Nivel efectivo de una persona en una carpeta.
  function nivelCarpeta(path: string, username: string): FolderPermLevel {
    const fp = perms[path];
    if (!fp) return "escritura";
    if ((fp.owner || "").toLowerCase() === username.toLowerCase()) return "total";
    return fp.levels[username] ?? fp.defaultPerm;
  }
  // Cuántas carpetas tiene con acceso (nivel != none).
  function carpetasConAcceso(username: string): number {
    return folders.filter((f) => nivelCarpeta(f.path, username) !== "none").length;
  }

  async function setCarpetaNivel(path: string, username: string, nivel: FolderPermLevel) {
    const prev = perms[path] || { levels: {}, defaultPerm: "escritura" as FolderPermLevel, hidden: true, owner: null };
    const nextLevels = { ...prev.levels, [username]: nivel };
    const next = { ...prev, levels: nextLevels };
    setPerms((m) => ({ ...m, [path]: next }));
    const key = `${username}|${path}`;
    setSavingCarpeta(key);
    try {
      await fetch("/api/files/permisos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, perms: nextLevels, defaultPerm: next.defaultPerm, hidden: next.hidden }),
      });
      setGuardadoCarpeta(key);
      setTimeout(() => setGuardadoCarpeta((k) => (k === key ? null : k)), 1500);
    } finally {
      setSavingCarpeta((k) => (k === key ? null : k));
    }
  }

  return (
    <div className="bg-white border border-[#EDE9E0] p-5">
      <div className="flex items-center gap-2 mb-1 text-[#1B2A5E]">
        <ShieldCheck size={16} className="text-[#C9A84C]" />
        <h3 className="font-semibold">Accesos por persona</h3>
      </div>
      <p className="text-[#7A7A7A] text-xs mb-4">
        Define el perfil de cada quien, a qué secciones sensibles entra (oculto,
        solo lectura o total) y, con «Carpetas», su acceso a cada carpeta de
        Archivos compartidos. Los administradores siempre tienen acceso total.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-2 py-2 font-semibold">Persona</th>
              <th className="px-2 py-2 font-semibold">Perfil</th>
              {SECCIONES.map((s) => <th key={s.id} className="px-2 py-2 font-semibold">{s.label}</th>)}
              <th className="px-2 py-2 font-semibold text-center">Papelera</th>
              <th className="px-2 py-2 font-semibold text-center">Carpetas</th>
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
                      <input type="checkbox" checked={e.papeleraBorrar === true} onChange={(ev) => save(e.id, { papeleraBorrar: ev.target.checked })} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => setOpenId(abierto ? null : e.id)}
                        className="inline-flex items-center gap-1 border border-[#EDE9E0] px-2 py-1 text-xs text-[#1B2A5E] hover:border-[#C9A84C]">
                        <FolderLock size={13} /> {carpetasConAcceso(e.username)}/{folders.length}
                        {abierto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </td>
                  </tr>
                  {abierto && (
                    <tr className="bg-[#F5F2EC]/40">
                      <td colSpan={SECCIONES.length + 4} className="px-4 py-3">
                        {folders.length === 0 ? (
                          <p className="text-xs text-[#7A7A7A]">No hay carpetas en «Archivos compartidos» todavía, o el NAS no respondió.</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {folders.map((f) => {
                              const key = `${e.username}|${f.path}`;
                              return (
                                <div key={f.path} className="flex items-center justify-between gap-2 bg-white border border-[#EDE9E0] px-3 py-2">
                                  <span className="text-sm text-[#2C2C2C] truncate" title={f.name}>{f.name}</span>
                                  <span className="flex items-center gap-1 shrink-0">
                                    {savingCarpeta === key && <Loader2 size={12} className="animate-spin text-[#7A7A7A]" />}
                                    {guardadoCarpeta === key && <Check size={12} className="text-green-600" />}
                                    <select className={INPUT} value={nivelCarpeta(f.path, e.username)} onChange={(ev) => setCarpetaNivel(f.path, e.username, ev.target.value as FolderPermLevel)}>
                                      {CARPETA_NIVELES.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                                    </select>
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
              <tr><td colSpan={SECCIONES.length + 4} className="px-2 py-10 text-center text-[#7A7A7A]">Sin personal registrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
