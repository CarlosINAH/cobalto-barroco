"use client";

import { useEffect, useRef, useState } from "react";
import {
  Folder, FileText, Download, Upload, FolderPlus, RefreshCw, Loader2,
  ChevronRight, Home,
} from "lucide-react";

type Entry = {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  modified?: number;
  subidoPor?: string | null;
};

function humanSize(n?: number): string {
  if (!n || n <= 0) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

/**
 * Navegador del NAS para una carpeta raíz. Lista carpetas y archivos, navega a
 * subcarpetas y permite subir/crear carpeta (si `canUpload`). La navegación está
 * acotada a `root`: nunca sube por encima de esa carpeta (así un empleado queda
 * encerrado en el "compartido" de su proyecto). El padre lo monta con `key={root}`
 * para reiniciar la navegación al cambiar de proyecto.
 */
export default function NasBrowser({
  root,
  rootLabel,
  canUpload = true,
}: {
  root: string;
  rootLabel: string;
  canUpload?: boolean;
}) {
  const [stack, setStack] = useState<{ path: string; name: string }[]>([
    { path: root, name: rootLabel },
  ]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const cwd = stack[stack.length - 1].path;

  // Trae el contenido de la carpeta actual. Todos los setState ocurren dentro de
  // las callbacks del fetch (asíncronos), para no re-renderizar en cascada.
  useEffect(() => {
    let alive = true;
    fetch(`/api/files/list?path=${encodeURIComponent(cwd)}`)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) {
          setEntries([]);
          setError("No se pudo abrir la carpeta en el NAS.");
          return;
        }
        const d = await res.json();
        if (!alive) return;
        const list: Entry[] = (d.entries || []) as Entry[];
        list.sort((a, b) =>
          a.isDir === b.isDir
            ? a.name.localeCompare(b.name, "es")
            : a.isDir ? -1 : 1,
        );
        setEntries(list);
        setCanWrite(!!d.canWrite);
        setError("");
      })
      .catch(() => {
        if (alive) setError("Error de conexión con el NAS.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [cwd, reload]);

  function refrescar() {
    setLoading(true);
    setReload((n) => n + 1);
  }
  function entrar(e: Entry) {
    if (!e.isDir) return;
    setLoading(true);
    setStack((s) => [...s, { path: e.path, name: e.name }]);
  }
  function irA(i: number) {
    setLoading(true);
    setStack((s) => s.slice(0, i + 1));
  }

  async function subir(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    setBusy(true); setError("");
    try {
      const fd = new FormData();
      fd.append("path", cwd);
      Array.from(lista).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/files/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No se pudieron subir los archivos.");
      }
      setReload((n) => n + 1);
    } catch {
      setError("Error al subir los archivos.");
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
      const res = await fetch("/api/files/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: cwd, name: name.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No se pudo crear la carpeta.");
      }
      setReload((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  const mostrarAcciones = canUpload && canWrite;

  return (
    <div>
      {/* Barra: breadcrumb + acciones */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-[#7A7A7A] flex-wrap min-w-0">
          {stack.map((f, i) => (
            <span key={f.path} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={13} className="shrink-0" />}
              <button
                onClick={() => irA(i)}
                className="hover:text-[#1B2A5E] truncate max-w-[180px] flex items-center gap-1"
              >
                {i === 0 && <Home size={13} className="text-[#C9A84C]" />} {f.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refrescar} className="text-[#7A7A7A] hover:text-[#1B2A5E] p-1" title="Actualizar">
            <RefreshCw size={14} />
          </button>
          {mostrarAcciones && (
            <>
              <button
                onClick={crearCarpeta}
                disabled={busy}
                className="flex items-center gap-1.5 border border-[#EDE9E0] px-3 py-1.5 text-xs text-[#1B2A5E] hover:border-[#C9A84C] disabled:opacity-60"
              >
                <FolderPlus size={13} /> Carpeta
              </button>
              <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => subir(e.target.files)} />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex items-center gap-1.5 bg-[#1B2A5E] text-[#F5F2EC] px-3 py-1.5 text-xs tracking-wider uppercase font-semibold hover:bg-[#243470] disabled:opacity-60"
              >
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
        <p className="text-sm text-[#7A7A7A]">Esta carpeta está vacía{mostrarAcciones ? " — sube el primer archivo." : "."}</p>
      ) : (
        <div className="border border-[#EDE9E0] divide-y divide-[#F5F2EC]">
          {entries.map((e) => (
            <div key={e.path} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F5F2EC]/50">
              {e.isDir
                ? <Folder size={15} className="text-[#C9A84C] shrink-0" />
                : <FileText size={15} className="text-[#7A7A7A] shrink-0" />}
              {e.isDir ? (
                <button onClick={() => entrar(e)} className="flex-1 min-w-0 text-left text-sm text-[#1B2A5E] truncate hover:underline" title={e.name}>
                  {e.name}
                </button>
              ) : (
                <span className="flex-1 min-w-0 text-sm text-[#2C2C2C] truncate" title={e.name}>{e.name}</span>
              )}
              {!e.isDir && e.size ? <span className="text-[11px] text-[#7A7A7A] data-label shrink-0">{humanSize(e.size)}</span> : null}
              {!e.isDir && (
                <a
                  href={`/api/files/download?path=${encodeURIComponent(e.path)}&inline=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7A7A7A] hover:text-[#1B2A5E] shrink-0"
                  title="Abrir / descargar"
                >
                  <Download size={15} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
