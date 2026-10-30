"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Download, Upload, Loader2, RefreshCw, HardDrive } from "lucide-react";

type Archivo = { name: string; path: string; isDir: boolean; size?: number; modified?: number };

function humanSize(n?: number): string {
  if (!n || n <= 0) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

/**
 * Explorador de archivos de la carpeta de informes del proyecto (estilo Drive):
 * lista los archivos de la carpeta elegida, permite descargarlos/abrirlos y,
 * si `canUpload`, subir nuevos. Reutiliza los endpoints del NAS.
 */
export default function CarpetaArchivos({ path, canUpload = false }: { path: string; canUpload?: boolean }) {
  const [files, setFiles] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trae los archivos de la carpeta. `mostrarCarga` evita el parpadeo en la
  // carga inicial del efecto (el estado ya arranca en "loading").
  async function cargar(mostrarCarga = true) {
    if (mostrarCarga) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) { setFiles([]); setError("No se pudo abrir la carpeta en el NAS."); return; }
      const d = await res.json();
      setFiles((d.entries || []).filter((e: Archivo) => !e.isDir));
    } catch {
      setError("Error de conexión con el NAS.");
    } finally {
      setLoading(false);
    }
  }

  // Carga inicial / al cambiar de carpeta: sin setState síncrono en el efecto.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
        const d = res.ok ? await res.json() : null;
        if (!vivo) return;
        if (!d) { setFiles([]); setError("No se pudo abrir la carpeta en el NAS."); }
        else setFiles((d.entries || []).filter((e: Archivo) => !e.isDir));
      } catch {
        if (vivo) setError("Error de conexión con el NAS.");
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, [path]);

  async function subir(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    setSubiendo(true); setError("");
    try {
      const fd = new FormData();
      fd.append("path", path);
      Array.from(lista).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/files/upload", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "No se pudieron subir los archivos."); }
      await cargar();
    } catch {
      setError("Error al subir los archivos.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-4 border-t border-[#EDE9E0] pt-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold">
          <HardDrive size={14} className="text-[#C9A84C]" /> Archivos de la carpeta
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => cargar()} className="text-[#7A7A7A] hover:text-[#1B2A5E] p-1" title="Actualizar"><RefreshCw size={14} /></button>
          {canUpload && (
            <>
              <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => subir(e.target.files)} />
              <button onClick={() => inputRef.current?.click()} disabled={subiendo}
                className="flex items-center gap-1.5 bg-[#1B2A5E] text-[#F5F2EC] px-3 py-1.5 text-xs tracking-wider uppercase font-semibold hover:bg-[#243470] disabled:opacity-60">
                {subiendo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Subir
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#7A7A7A] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando…</p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-[#7A7A7A]">La carpeta está vacía{canUpload ? " — sube el primer archivo." : "."}</p>
      ) : (
        <div className="border border-[#EDE9E0] divide-y divide-[#F5F2EC]">
          {files.map((f) => (
            <div key={f.path} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F5F2EC]/50">
              <FileText size={15} className="text-[#C9A84C] shrink-0" />
              <span className="flex-1 min-w-0 text-sm text-[#2C2C2C] truncate" title={f.name}>{f.name}</span>
              {f.size ? <span className="text-[11px] text-[#7A7A7A] data-label shrink-0">{humanSize(f.size)}</span> : null}
              <a href={`/api/files/download?path=${encodeURIComponent(f.path)}&inline=1`} target="_blank" rel="noopener noreferrer"
                className="text-[#7A7A7A] hover:text-[#1B2A5E] shrink-0" title="Abrir / descargar"><Download size={15} /></a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
