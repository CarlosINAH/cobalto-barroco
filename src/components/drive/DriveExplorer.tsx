"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  HardDrive, Folder, FileText, Download, Upload, FolderPlus, RefreshCw,
  Loader2, ChevronRight, Home, Link2, AlertCircle, CheckCircle2,
} from "lucide-react";

type Entry = {
  id: string; name: string; isFolder: boolean;
  size?: number; modifiedTime?: string; webViewLink?: string;
};

function humanSize(n?: number): string {
  if (!n || n <= 0) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

/**
 * Explorador del Drive central de la empresa (solo administración). Permite
 * conectar la cuenta de Google central y, una vez conectada, navegar carpetas,
 * subir, crear carpetas y abrir/descargar archivos. El token vive solo en el
 * servidor; aquí se usan los endpoints /api/drive/*.
 */
export default function DriveExplorer() {
  const search = useSearchParams();
  const dconn = search.get("dconn"); // ok | norefresh

  const [st, setSt] = useState<{ loading: boolean; enabled: boolean; connected: boolean; email?: string }>(
    { loading: true, enabled: false, connected: false },
  );
  const [stack, setStack] = useState<{ id: string; name: string }[]>([{ id: "root", name: "Mi unidad" }]);
  const folderId = stack[stack.length - 1].id;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Estado de la conexión (habilitado / conectado / correo).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/drive/status");
        const d = r.ok ? await r.json() : null;
        if (!vivo) return;
        if (d) setSt({ loading: false, enabled: !!d.enabled, connected: !!d.connected, email: d.email || undefined });
        else setSt((s) => ({ ...s, loading: false }));
      } catch {
        if (vivo) setSt((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { vivo = false; };
  }, []);

  // Contenido de la carpeta actual (cuando hay conexión).
  useEffect(() => {
    if (!st.connected) return;
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`/api/drive/list?folderId=${encodeURIComponent(folderId)}`);
        const d = r.ok ? await r.json() : await r.json().catch(() => null);
        if (!vivo) return;
        if (!d || d.error) { setError(d?.error || "No se pudo listar el Drive."); setEntries([]); }
        else { setError(""); setEntries(d.entries || []); }
      } catch {
        if (vivo) setError("Error de conexión con Drive.");
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, [folderId, st.connected]);

  async function recargar() {
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/drive/list?folderId=${encodeURIComponent(folderId)}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error || "No se pudo listar el Drive."); setEntries([]); return; }
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
    if (!lista || lista.length === 0) return;
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

  async function desconectar() {
    if (!window.confirm("¿Desconectar el Drive central? Habrá que volver a conectarlo para usarlo.")) return;
    await fetch("/api/drive/disconnect", { method: "POST" });
    setSt((s) => ({ ...s, connected: false, email: undefined }));
  }

  if (st.loading) {
    return <p className="flex items-center gap-2 text-sm text-[#7A7A7A]"><Loader2 size={14} className="animate-spin" /> Cargando…</p>;
  }

  if (!st.enabled) {
    return (
      <div className="bg-white border border-[#EDE9E0] p-6">
        <p className="text-sm text-[#7A7A7A]">La integración con Google no está configurada en este entorno.</p>
      </div>
    );
  }

  if (!st.connected) {
    return (
      <div className="bg-white border border-[#EDE9E0] p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="flex h-10 w-10 items-center justify-center bg-[#1B2A5E]/5 text-[#C9A84C]"><HardDrive size={20} /></span>
          <div>
            <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Drive central</h3>
            <p className="text-sm text-[#7A7A7A]">Conecta la cuenta de Google de la empresa para gestionar su Drive desde aquí.</p>
          </div>
        </div>
        {dconn === "norefresh" && (
          <p className="flex items-center gap-2 text-sm text-amber-700 mb-3"><AlertCircle size={15} /> Google no entregó el permiso reutilizable. Vuelve a intentarlo y acepta el acceso.</p>
        )}
        <a href="/api/auth/google/start?intent=drive"
          className="inline-flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470]">
          <Link2 size={15} /> Conectar Drive central
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="flex items-center gap-2 text-xs text-[#7A7A7A]">
          <CheckCircle2 size={14} className="text-green-600" /> Conectado{st.email ? `: ${st.email}` : ""}
        </p>
        <button onClick={desconectar} className="text-xs text-[#7A7A7A] hover:text-red-600 underline">Desconectar</button>
      </div>

      {dconn === "ok" && (
        <p className="flex items-center gap-2 text-sm text-green-700 mb-3"><CheckCircle2 size={15} /> Drive conectado correctamente.</p>
      )}

      {/* Barra de navegación + acciones */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-[#7A7A7A] flex-wrap min-w-0">
          {stack.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={13} className="shrink-0" />}
              <button onClick={() => irA(i)} className="hover:text-[#1B2A5E] truncate max-w-[160px] flex items-center gap-1">
                {i === 0 && <Home size={13} className="text-[#C9A84C]" />} {f.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={recargar} className="text-[#7A7A7A] hover:text-[#1B2A5E] p-1" title="Actualizar"><RefreshCw size={14} /></button>
          <button onClick={crearCarpeta} disabled={busy}
            className="flex items-center gap-1.5 border border-[#EDE9E0] px-3 py-1.5 text-xs text-[#1B2A5E] hover:border-[#C9A84C] disabled:opacity-60">
            <FolderPlus size={13} /> Carpeta
          </button>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => subir(e.target.files)} />
          <button onClick={() => inputRef.current?.click()} disabled={busy}
            className="flex items-center gap-1.5 bg-[#1B2A5E] text-[#F5F2EC] px-3 py-1.5 text-xs tracking-wider uppercase font-semibold hover:bg-[#243470] disabled:opacity-60">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Subir
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#7A7A7A] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando…</p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[#7A7A7A]">La carpeta está vacía.</p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
