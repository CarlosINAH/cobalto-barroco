"use client";

import { useState } from "react";
import { FolderOpen, Folder, ChevronRight, X, Plus, Check, Loader2, CornerLeftUp } from "lucide-react";

// Repositorio de proyectos en el NAS (bajo "Archivos compartidos").
const BASE = "Archivos compartidos";
const START = `${BASE}/PROYECTOS_COBALTO`;

type Entry = { name: string; path: string; isDir: boolean };

/**
 * Selector de "Carpeta de informes" del proyecto: navega dentro de
 * PROYECTOS_COBALTO en el NAS, permite elegir una carpeta existente o crear una
 * nueva (p. ej. con el nombre del proyecto) y la guarda en el proyecto.
 */
export default function CarpetaInformesPicker({ projectId, projectNombre, initial }: {
  projectId: string; projectNombre: string; initial: string;
}) {
  const [valor, setValor] = useState(initial);
  const [open, setOpen] = useState(false);
  const [cwd, setCwd] = useState(START);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(path: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) { setEntries([]); setError("No se pudo abrir la carpeta (¿existe PROYECTOS_COBALTO y tienes acceso?)."); return; }
      const d = await res.json();
      setEntries((d.entries || []).filter((e: Entry) => e.isDir));
    } catch {
      setError("Error de conexión con el NAS.");
    } finally {
      setLoading(false);
    }
  }

  function abrir() {
    const start = valor && valor.startsWith(BASE) ? valor : START;
    setCwd(start); setNuevo(projectNombre); setOpen(true); load(start);
  }
  function entrar(e: Entry) { setCwd(e.path); load(e.path); }
  function subir() {
    if (cwd === START || cwd === BASE) return;
    const parent = cwd.split("/").slice(0, -1).join("/");
    const safe = parent.length >= BASE.length ? parent : START;
    setCwd(safe); load(safe);
  }

  async function guardar(path: string) {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carpetaInformes: path }),
    });
    setBusy(false);
    if (res.ok) { setValor(path); setOpen(false); }
    else setError("No se pudo guardar la carpeta en el proyecto.");
  }

  async function crear() {
    const name = nuevo.trim();
    if (!name) return;
    setBusy(true); setError("");
    const res = await fetch("/api/files/folder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: cwd, name }),
    });
    setBusy(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "No se pudo crear la carpeta."); return; }
    await load(cwd);
  }

  const INPUT = "border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";

  return (
    <div className="mt-4">
      <span className="flex items-center gap-1.5 text-xs text-[#7A7A7A] mb-1"><FolderOpen size={13} className="text-[#C9A84C]" /> Carpeta de informes (Word / PDF / Excel y otros)</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#2C2C2C] truncate max-w-xl">{valor || <span className="text-[#7A7A7A]">Sin carpeta asignada</span>}</span>
        <button onClick={abrir} className="flex items-center gap-1.5 border border-[#EDE9E0] text-[#1B2A5E] px-3 py-1.5 text-xs tracking-wider uppercase font-semibold hover:border-[#C9A84C]">
          <FolderOpen size={13} /> Elegir / crear
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white border border-[#EDE9E0] w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE9E0]">
              <h3 className="text-[#1B2A5E] font-semibold text-sm">Carpeta de informes</h3>
              <button onClick={() => setOpen(false)} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={18} /></button>
            </div>

            {/* Ruta actual */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[#EDE9E0] text-xs text-[#7A7A7A]">
              {cwd !== START && (
                <button onClick={subir} className="flex items-center gap-1 text-[#1B2A5E] hover:text-[#C9A84C]"><CornerLeftUp size={13} /> Subir</button>
              )}
              <span className="truncate flex items-center gap-1"><Folder size={12} className="text-[#C9A84C]" /> {cwd.replace(BASE + "/", "")}</span>
            </div>

            {/* Listado de subcarpetas */}
            <div className="flex-1 overflow-y-auto min-h-[8rem]">
              {loading ? (
                <p className="p-4 text-sm text-[#7A7A7A] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando…</p>
              ) : entries.length === 0 ? (
                <p className="p-4 text-sm text-[#7A7A7A]">Sin subcarpetas aquí. Puedes crear una abajo.</p>
              ) : (
                entries.map((e) => (
                  <button key={e.path} onClick={() => entrar(e)} className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/60 text-left">
                    <span className="flex items-center gap-2 text-sm text-[#2C2C2C] truncate"><Folder size={15} className="text-[#C9A84C] shrink-0" /> {e.name}</span>
                    <ChevronRight size={14} className="text-[#C0BDB8] shrink-0" />
                  </button>
                ))
              )}
            </div>

            {error && <p className="px-4 py-2 text-xs text-red-600">{error}</p>}

            {/* Crear carpeta aquí */}
            <div className="px-4 py-3 border-t border-[#EDE9E0] flex items-center gap-2">
              <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nombre de la nueva carpeta" className={INPUT + " flex-1 min-w-0"} />
              <button onClick={crear} disabled={busy || !nuevo.trim()} className="flex items-center gap-1 border border-[#EDE9E0] text-[#1B2A5E] px-3 py-2 text-xs uppercase font-semibold hover:border-[#C9A84C] disabled:opacity-50"><Plus size={13} /> Crear aquí</button>
            </div>

            {/* Usar la carpeta actual */}
            <div className="px-4 py-3 border-t border-[#EDE9E0] flex items-center justify-between gap-2">
              <span className="text-xs text-[#7A7A7A] truncate">Usar: <span className="text-[#2C2C2C]">{cwd.replace(BASE + "/", "")}</span></span>
              <button onClick={() => guardar(cwd)} disabled={busy} className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Usar esta carpeta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
