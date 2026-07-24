"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FolderPlus,
  Download,
  Trash2,
  Folder,
  FileImage,
  FileText,
  File as FileIcon,
  ChevronRight,
  Home,
  Loader2,
} from "lucide-react";

interface Entry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified: number;
}

function humanSize(n: number): string {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

function fmtDate(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fileIcon(name: string, isDir: boolean) {
  if (isDir) return <Folder size={18} className="text-[#C9A84C]" />;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "bmp", "tiff"].includes(ext))
    return <FileImage size={18} className="text-[#C9A84C]" />;
  if (["pdf"].includes(ext))
    return <FileText size={18} className="text-red-400" />;
  return <FileIcon size={18} className="text-blue-400" />;
}

export default function FileBrowser({ rootLabel = "Inicio" }: { rootLabel?: string }) {
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar.");
        setEntries([]);
        return;
      }
      setEntries(data.entries);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(path);
  }, [path, load]);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("path", path);
    Array.from(files).forEach((f) => form.append("files", f));
    try {
      const res = await fetch("/api/files/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setError(data.error || "No se pudo subir.");
      else await load(path);
    } catch {
      setError("Error al subir.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const onNewFolder = async () => {
    const name = window.prompt("Nombre de la nueva carpeta:");
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/files/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, name }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "No se pudo crear.");
      else await load(path);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (entry: Entry) => {
    if (!window.confirm(`¿Eliminar "${entry.name}"? Esta acción no se puede deshacer.`))
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: entry.path }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "No se pudo eliminar.");
      else await load(path);
    } finally {
      setBusy(false);
    }
  };

  const crumbs = path ? path.split("/").filter(Boolean) : [];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-[#7A7A7A] flex-wrap">
          <button
            onClick={() => setPath("")}
            className="flex items-center gap-1.5 hover:text-[#1B2A5E] transition-colors"
          >
            <Home size={14} className="text-[#C9A84C]" />
            {rootLabel}
          </button>
          {crumbs.map((c, i) => {
            const target = crumbs.slice(0, i + 1).join("/");
            return (
              <span key={target} className="flex items-center gap-1.5">
                <ChevronRight size={13} className="text-[#EDE9E0]" />
                <button
                  onClick={() => setPath(target)}
                  className={`hover:text-[#1B2A5E] transition-colors ${
                    i === crumbs.length - 1 ? "text-[#1B2A5E] font-medium" : ""
                  }`}
                >
                  {c}
                </button>
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewFolder}
            disabled={busy}
            className="flex items-center gap-2 border border-[#EDE9E0] text-[#1B2A5E] px-3 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#F5F2EC] transition-colors disabled:opacity-50"
          >
            <FolderPlus size={13} /> Carpeta
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Subir
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => onUpload(e.target.files)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 px-4 py-2.5 text-red-600 text-xs mb-4">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-[#EDE9E0]">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-[#EDE9E0] text-[#7A7A7A] text-xs tracking-widest uppercase">
          <div className="col-span-6">Nombre</div>
          <div className="col-span-2 hidden md:block">Tamaño</div>
          <div className="col-span-2 hidden md:block">Modificado</div>
          <div className="col-span-2 text-right">Acción</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#7A7A7A] text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-[#7A7A7A] text-sm">
            Esta carpeta está vacía. Usa <span className="text-[#1B2A5E] font-medium">Subir</span> para agregar archivos.
          </div>
        ) : (
          entries.map((e) => (
            <div
              key={e.path}
              className="grid grid-cols-12 px-5 py-3.5 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] transition-colors items-center"
            >
              <div className="col-span-6 flex items-center gap-3 min-w-0">
                {fileIcon(e.name, e.isDir)}
                {e.isDir ? (
                  <button
                    onClick={() => setPath(e.path)}
                    className="text-[#2C2C2C] text-sm truncate hover:text-[#1B2A5E] hover:underline text-left"
                  >
                    {e.name}
                  </button>
                ) : (
                  <span className="text-[#2C2C2C] text-sm truncate">{e.name}</span>
                )}
              </div>
              <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm">
                {e.isDir ? "—" : humanSize(e.size)}
              </div>
              <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm">
                {fmtDate(e.modified)}
              </div>
              <div className="col-span-2 flex justify-end gap-1">
                {!e.isDir && (
                  <a
                    href={`/api/files/download?path=${encodeURIComponent(e.path)}`}
                    className="text-[#7A7A7A] hover:text-[#1B2A5E] transition-colors p-1.5"
                    title="Descargar"
                  >
                    <Download size={14} />
                  </a>
                )}
                <button
                  onClick={() => onDelete(e)}
                  className="text-[#7A7A7A] hover:text-red-500 transition-colors p-1.5"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
