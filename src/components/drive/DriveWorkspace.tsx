"use client";

import { useEffect, useRef, useState } from "react";
import {
  Folder, FileText, Download, Upload, FolderPlus, RefreshCw, Loader2,
  ChevronRight, Home, AlertCircle, FileType, Sheet, Trash2, HardDrive, Link2,
} from "lucide-react";

type Entry = {
  id: string; name: string; isFolder: boolean;
  size?: number; modifiedTime?: string; webViewLink?: string;
};
type Caps = {
  ver: boolean; subir: boolean; crearCarpeta: boolean; papelera: boolean; borrarReal: boolean;
};
type Info = {
  enabled: boolean; connected: boolean; isAdmin: boolean;
  folderId: string | null; folderName: string; caps: Caps;
};

function humanSize(n?: number): string {
  if (!n || n <= 0) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

/**
 * Área de Archivos del equipo: una sola carpeta del Drive central
 * (PROYECTOS_COBALTO) que todos pueden abrir. Las acciones (subir, crear
 * carpeta, mandar a papelera) dependen del rol; los permisos los decide el
 * servidor y aquí solo se muestran/ocultan los botones.
 */
export default function DriveWorkspace() {
  const [info, setInfo] = useState<Info | null>(null);
  const [cargandoInfo, setCargandoInfo] = useState(true);
  const [stack, setStack] = useState<{ id: string; name: string }[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const folderId = stack.length ? stack[stack.length - 1].id : null;
  const caps = info?.caps;

  // Resuelve la carpeta de trabajo y los permisos (una vez).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/drive/workspace");
        const d: Info | null = r.ok ? await r.json() : null;
        if (!vivo) return;
        if (d) {
          setInfo(d);
          if (d.folderId) setStack([{ id: d.folderId, name: d.folderName }]);
        }
      } catch { /* sin Drive */ } finally {
        if (vivo) setCargandoInfo(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  // Contenido de la carpeta actual.
  useEffect(() => {
    if (!folderId) return;
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`/api/drive/list?folderId=${encodeURIComponent(folderId)}`);
        const d = await r.json().catch(() => null);
        if (!vivo) return;
        if (!d || d.error) { setError(d?.error || "No se pudo listar la carpeta."); setEntries([]); }
        else { setError(""); setEntries(d.entries || []); }
      } catch {
        if (vivo) setError("Error de conexión con Drive.");
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, [folderId]);

  async function recargar() {
    if (!folderId) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/drive/list?folderId=${encodeURIComponent(folderId)}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error || "No se pudo listar la carpeta."); setEntries([]); return; }
      setEntries(d.entries || []);
    } catch {
      setError("Error de conexión con Drive.");
    } finally {
      setLoading(false);
    }
  }

  function abrirCarpeta(e: Entry) { setLoading(true); setStack((s) => [...s, { id: e.id, name: e.name }]); }
  function irA(i: number) { setLoading(true); setStack((s) => s.slice(0, i + 1)); }

  async function subir(lista: FileList | null) {
    if (!lista || lista.length === 0 || !folderId) return;
    setBusy(true); setError("");
    try {
      const fd = new FormData();
      fd.append("folderId", folderId);
      Array.from(lista).forEach((f) => fd.append("files", f));
      const r = await fetch("/api/drive/upload", { method: "POST", body: fd });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || "No se pudieron subir los archivos."); }
      await recargar();
    } catch {
      setError("Error al subir a Drive.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function crearCarpeta() {
    if (!folderId) return;
    const name = window.prompt("Nombre de la nueva carpeta:");
    if (!name || !name.trim()) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/drive/folder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parentId: folderId }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || "No se pudo crear la carpeta."); }
      await recargar();
    } finally {
      setBusy(false);
    }
  }

  async function crearGoogle(kind: "document" | "spreadsheet") {
    if (!folderId) return;
    const def = kind === "spreadsheet" ? "Nueva hoja" : "Nuevo documento";
    const name = window.prompt(`Nombre del ${kind === "spreadsheet" ? "la hoja" : "documento"}:`, def);
    if (name === null) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/drive/create-doc", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name: name.trim() || def, parentId: folderId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "No se pudo crear."); return; }
      if (d.entry?.webViewLink) window.open(d.entry.webViewLink, "_blank", "noopener");
      await recargar();
    } finally {
      setBusy(false);
    }
  }

  async function mandarPapelera(e: Entry) {
    if (!window.confirm(`¿Mandar "${e.name}" a la papelera? Se puede recuperar.`)) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/drive/trash", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: e.id }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || "No se pudo eliminar."); }
      await recargar();
    } finally {
      setBusy(false);
    }
  }

  // ── Estados previos al explorador ──
  if (cargandoInfo) {
    return <p className="flex items-center gap-2 text-sm text-[#7A7A7A]"><Loader2 size={14} className="animate-spin" /> Cargando…</p>;
  }
  if (!info?.enabled) {
    return (
      <div className="bg-white border border-[#EDE9E0] p-6">
        <p className="text-sm text-[#7A7A7A]">La integración con Google no está configurada en este entorno.</p>
      </div>
    );
  }
  if (!info.connected) {
    return (
      <div className="bg-white border border-[#EDE9E0] p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="flex h-10 w-10 items-center justify-center bg-[#1B2A5E]/5 text-[#C9A84C]"><HardDrive size={20} /></span>
          <div>
            <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Archivos del equipo</h3>
            <p className="text-sm text-[#7A7A7A]">El Drive de la empresa aún no está conectado.</p>
          </div>
        </div>
        {info.isAdmin ? (
          <a href="/api/auth/google/start?intent=drive"
            className="inline-flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470]">
            <Link2 size={15} /> Conectar Drive de la empresa
          </a>
        ) : (
          <p className="text-sm text-[#7A7A7A]">Pídele a un administrador que conecte el Drive de la empresa.</p>
        )}
      </div>
    );
  }
  if (!info.folderId) {
    return (
      <div className="bg-white border border-[#EDE9E0] p-6">
        <p className="flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle size={15} /> No se encontró la carpeta «{info.folderName}» en el Drive.
          {info.isAdmin ? " Se creará automáticamente; recarga la página." : " Pídele a un administrador que la cree."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Navegación + acciones (según permisos) */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-[#7A7A7A] flex-wrap min-w-0">
          {stack.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={13} className="shrink-0" />}
              <button onClick={() => irA(i)} className="hover:text-[#1B2A5E] truncate max-w-[180px] flex items-center gap-1">
                {i === 0 && <Home size={13} className="text-[#C9A84C]" />} {f.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={recargar} className="text-[#7A7A7A] hover:text-[#1B2A5E] p-1" title="Actualizar"><RefreshCw size={14} /></button>
          {caps?.crearCarpeta && (
            <>
              <button onClick={crearCarpeta} disabled={busy}
                className="flex items-center gap-1.5 border border-[#EDE9E0] px-3 py-1.5 text-xs text-[#1B2A5E] hover:border-[#C9A84C] disabled:opacity-60">
                <FolderPlus size={13} /> Carpeta
              </button>
              <button onClick={() => crearGoogle("document")} disabled={busy}
                className="flex items-center gap-1.5 border border-[#EDE9E0] px-3 py-1.5 text-xs text-[#1B2A5E] hover:border-[#C9A84C] disabled:opacity-60" title="Nuevo Google Doc">
                <FileType size={13} /> Doc
              </button>
              <button onClick={() => crearGoogle("spreadsheet")} disabled={busy}
                className="flex items-center gap-1.5 border border-[#EDE9E0] px-3 py-1.5 text-xs text-[#1B2A5E] hover:border-[#C9A84C] disabled:opacity-60" title="Nueva Hoja de cálculo">
                <Sheet size={13} /> Hoja
              </button>
            </>
          )}
          {caps?.subir && (
            <>
              <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => subir(e.target.files)} />
              <button onClick={() => inputRef.current?.click()} disabled={busy}
                className="flex items-center gap-1.5 bg-[#1B2A5E] text-[#F5F2EC] px-3 py-1.5 text-xs tracking-wider uppercase font-semibold hover:bg-[#243470] disabled:opacity-60">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Subir
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#7A7A7A] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando…</p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[#7A7A7A]">Esta carpeta está vacía.</p>
      ) : (
        <div className="border border-[#EDE9E0] divide-y divide-[#F5F2EC]">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F5F2EC]/50">
              {e.isFolder
                ? <Folder size={15} className="text-[#C9A84C] shrink-0" />
                : <FileText size={15} className="text-[#7A7A7A] shrink-0" />}
              {e.isFolder ? (
                <button onClick={() => abrirCarpeta(e)} className="flex-1 min-w-0 text-left text-sm text-[#1B2A5E] truncate hover:underline" title={e.name}>{e.name}</button>
              ) : (
                <span className="flex-1 min-w-0 text-sm text-[#2C2C2C] truncate" title={e.name}>{e.name}</span>
              )}
              {!e.isFolder && e.size ? <span className="text-[11px] text-[#7A7A7A] data-label shrink-0">{humanSize(e.size)}</span> : null}
              {!e.isFolder && (
                <a href={`/api/drive/download?id=${encodeURIComponent(e.id)}`} target="_blank" rel="noopener noreferrer"
                  className="text-[#7A7A7A] hover:text-[#1B2A5E] shrink-0" title="Abrir / descargar"><Download size={15} /></a>
              )}
              {caps?.papelera && (
                <button onClick={() => mandarPapelera(e)} disabled={busy}
                  className="text-[#7A7A7A] hover:text-red-500 shrink-0 disabled:opacity-50" title="Mandar a la papelera">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
