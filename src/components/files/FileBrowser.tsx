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
  History,
  X,
  UploadCloud,
  Pencil,
  Trash,
  Share2,
  Users,
  Lock,
  Check,
  Send,
} from "lucide-react";

const SHARED_ROOT = "Archivos compartidos";
const inSharedArea = (p: string) =>
  p === SHARED_ROOT || p.startsWith(SHARED_ROOT + "/");

interface Entry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified: number;
  subidoPor?: string | null;
  subidoEn?: number | null;
  restricted?: boolean;
  canManage?: boolean;
}

interface FileEvent {
  usuario: string;
  accion: "subido" | "modificado" | "eliminado";
  fecha: number;
}
interface FileMeta {
  path: string;
  nombre: string;
  subidoPor: string;
  subidoEn: number;
  ultimaAccion: number;
  historial: FileEvent[];
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

function fmtDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default function FileBrowser({
  rootLabel = "Inicio",
  basePath = "",
  withMeta = false,
  canPublish = false,
}: {
  rootLabel?: string;
  basePath?: string;
  withMeta?: boolean;
  /** Permite publicar carpetas propias en "Archivos compartidos" (Nube personal). */
  canPublish?: boolean;
}) {
  const [path, setPath] = useState(basePath);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canWrite, setCanWrite] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyFor, setHistoryFor] = useState<Entry | null>(null);
  const [shareFor, setShareFor] = useState<Entry | null>(null);
  const [publishFor, setPublishFor] = useState<Entry | null>(null);
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
      setIsAdmin(data.role === "admin");
      setCanWrite(data.canWrite !== false);
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

  // Breadcrumb relativo a la carpeta raíz (basePath).
  const rel =
    basePath && path.startsWith(basePath)
      ? path.slice(basePath.length).replace(/^\/+/, "")
      : path;
  const crumbs = rel ? rel.split("/").filter(Boolean) : [];
  const goCrumb = (i: number) =>
    setPath([basePath, ...crumbs.slice(0, i + 1)].filter(Boolean).join("/"));

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-[#7A7A7A] flex-wrap">
          <button
            onClick={() => setPath(basePath)}
            className="flex items-center gap-1.5 hover:text-[#1B2A5E] transition-colors"
          >
            <Home size={14} className="text-[#C9A84C]" />
            {rootLabel}
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight size={13} className="text-[#EDE9E0]" />
              <button
                onClick={() => goCrumb(i)}
                className={`hover:text-[#1B2A5E] transition-colors ${
                  i === crumbs.length - 1 ? "text-[#1B2A5E] font-medium" : ""
                }`}
              >
                {c}
              </button>
            </span>
          ))}
        </div>

        {canWrite && (
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
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 px-4 py-2.5 text-red-600 text-xs mb-4">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-[#EDE9E0] overflow-x-auto">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-[#EDE9E0] text-[#7A7A7A] text-xs tracking-widest uppercase min-w-[640px]">
          <div className={withMeta ? "col-span-4" : "col-span-6"}>Nombre</div>
          {withMeta ? (
            <>
              <div className="col-span-2 hidden md:block">Subido por</div>
              <div className="col-span-2 hidden md:block">Subido el</div>
            </>
          ) : (
            <div className="col-span-2 hidden md:block">Tamaño</div>
          )}
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
              className="grid grid-cols-12 px-5 py-3.5 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] transition-colors items-center min-w-[640px]"
            >
              <div className={`${withMeta ? "col-span-4" : "col-span-6"} flex items-center gap-3 min-w-0`}>
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
                {e.restricted && (
                  <span
                    className="shrink-0 text-[#C9A84C]"
                    title="Compartida solo con algunos empleados"
                  >
                    <Lock size={11} />
                  </span>
                )}
              </div>
              {withMeta ? (
                <>
                  <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm truncate">
                    {e.subidoPor || <span className="text-[#C0BDB8]">—</span>}
                  </div>
                  <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm">
                    {fmtDate(e.subidoEn)}
                  </div>
                </>
              ) : (
                <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm">
                  {e.isDir ? "—" : humanSize(e.size)}
                </div>
              )}
              <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm">
                {fmtDate(e.modified)}
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                {canPublish && e.isDir && !inSharedArea(e.path) && (
                  <button
                    onClick={() => setPublishFor(e)}
                    className="flex items-center justify-center border border-[#C9A84C] text-[#1B2A5E] hover:bg-[#C9A84C] hover:text-[#1B2A5E] transition-colors p-1.5"
                    title="Compartir con el equipo"
                    aria-label={`Compartir ${e.name} con el equipo`}
                  >
                    <Send size={14} />
                  </button>
                )}
                {withMeta && e.isDir && e.canManage && (
                  <button
                    onClick={() => setShareFor(e)}
                    className="flex items-center justify-center border border-[#EDE9E0] text-[#1B2A5E] hover:bg-[#1B2A5E] hover:text-[#F5F2EC] transition-colors p-1.5"
                    title="Compartir carpeta"
                    aria-label={`Compartir ${e.name}`}
                  >
                    <Share2 size={14} />
                  </button>
                )}
                {withMeta && !e.isDir && (
                  <button
                    onClick={() => setHistoryFor(e)}
                    className="flex items-center justify-center border border-[#EDE9E0] text-[#1B2A5E] hover:bg-[#1B2A5E] hover:text-[#F5F2EC] transition-colors p-1.5"
                    title="Historial"
                    aria-label={`Historial de ${e.name}`}
                  >
                    <History size={14} />
                  </button>
                )}
                {!e.isDir && (
                  <a
                    href={`/api/files/download?path=${encodeURIComponent(e.path)}`}
                    className="flex items-center justify-center border border-[#EDE9E0] text-[#1B2A5E] hover:bg-[#1B2A5E] hover:text-[#F5F2EC] transition-colors p-1.5"
                    title="Descargar"
                    aria-label={`Descargar ${e.name}`}
                  >
                    <Download size={14} />
                  </a>
                )}
                {isAdmin && (
                  <button
                    onClick={() => onDelete(e)}
                    disabled={busy}
                    className="flex items-center justify-center border border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-colors p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Eliminar"
                    aria-label={`Eliminar ${e.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {historyFor && (
        <HistoryModal entry={historyFor} onClose={() => setHistoryFor(null)} />
      )}
      {shareFor && (
        <ShareModal
          entry={shareFor}
          onClose={() => setShareFor(null)}
          onSaved={() => {
            setShareFor(null);
            load(path);
          }}
        />
      )}
      {publishFor && (
        <PublishModal
          entry={publishFor}
          onClose={() => setPublishFor(null)}
          onSaved={() => {
            setPublishFor(null);
            load(path);
          }}
        />
      )}
    </div>
  );
}

interface EmployeeOpt {
  username: string;
  nombre: string;
}

function ShareModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: Entry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [everyone, setEveryone] = useState(true);
  const [allowed, setAllowed] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/files/share?path=${encodeURIComponent(entry.path)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setEmployees(d.employees || []);
        if (d.allowed === null) {
          setEveryone(true);
          setAllowed([]);
        } else {
          setEveryone(false);
          setAllowed(d.allowed);
        }
      })
      .catch(() => setError("No se pudo cargar."))
      .finally(() => setLoading(false));
  }, [entry.path]);

  const toggle = (u: string) =>
    setAllowed((a) => (a.includes(u) ? a.filter((x) => x !== u) : [...a, u]));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: entry.path, allowed: everyone ? null : allowed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      onSaved();
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
              <Share2 size={16} className="text-[#C9A84C]" /> Compartir carpeta
            </h3>
            <p className="text-[#7A7A7A] text-xs truncate">{entry.name}</p>
          </div>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-[#7A7A7A] text-sm py-6 justify-center">
              <Loader2 size={16} className="animate-spin" /> Cargando…
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2.5 text-sm text-[#2C2C2C] cursor-pointer">
                  <input type="radio" checked={everyone} onChange={() => setEveryone(true)} className="accent-[#C9A84C]" />
                  <Users size={14} className="text-[#7A7A7A]" />
                  Todos los empleados
                </label>
                <label className="flex items-center gap-2.5 text-sm text-[#2C2C2C] cursor-pointer">
                  <input type="radio" checked={!everyone} onChange={() => setEveryone(false)} className="accent-[#C9A84C]" />
                  <Lock size={14} className="text-[#7A7A7A]" />
                  Solo empleados seleccionados
                </label>
              </div>

              {!everyone && (
                <div className="border border-[#EDE9E0] bg-white max-h-56 overflow-y-auto">
                  {employees.length === 0 ? (
                    <p className="text-[#7A7A7A] text-xs p-4">No hay empleados registrados.</p>
                  ) : (
                    employees.map((emp) => (
                      <label
                        key={emp.username}
                        className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={allowed.includes(emp.username)}
                          onChange={() => toggle(emp.username)}
                          className="accent-[#C9A84C]"
                        />
                        <span className="text-[#2C2C2C]">{emp.nombre}</span>
                        <span className="text-[#7A7A7A] text-xs">@{emp.username}</span>
                      </label>
                    ))
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2.5 text-red-600 text-xs mt-3">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#EDE9E0]">
          <button onClick={onClose} className="px-4 py-2.5 text-xs tracking-widest uppercase font-semibold text-[#7A7A7A] hover:text-[#1B2A5E]">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function PublishModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: Entry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [everyone, setEveryone] = useState(false);
  const [allowed, setAllowed] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/files/publish")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setEmployees(d.employees || []))
      .catch(() => setError("No se pudo cargar la lista de empleados."))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (u: string) =>
    setAllowed((a) => (a.includes(u) ? a.filter((x) => x !== u) : [...a, u]));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/files/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: entry.path,
          allowed: everyone ? null : allowed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo compartir.");
        return;
      }
      onSaved();
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <div className="min-w-0">
            <h3
              className="flex items-center gap-2 text-[#1B2A5E] text-lg"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              <Send size={16} className="text-[#C9A84C]" /> Compartir con el equipo
            </h3>
            <p className="text-[#7A7A7A] text-xs truncate">{entry.name}</p>
          </div>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-[#7A7A7A] text-xs leading-relaxed mb-4">
            La carpeta pasará a <b>Archivos compartidos</b> para colaborar. Se
            mueve una sola copia (no duplica ni gasta espacio en el NAS), se
            guarda que tú la compartiste y la fecha, y el{" "}
            <b>administrador siempre tiene acceso</b>.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-[#7A7A7A] text-sm py-6 justify-center">
              <Loader2 size={16} className="animate-spin" /> Cargando…
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2.5 text-sm text-[#2C2C2C] cursor-pointer">
                  <input
                    type="radio"
                    checked={!everyone}
                    onChange={() => setEveryone(false)}
                    className="accent-[#C9A84C]"
                  />
                  <Lock size={14} className="text-[#7A7A7A]" />
                  Solo empleados seleccionados
                </label>
                <label className="flex items-center gap-2.5 text-sm text-[#2C2C2C] cursor-pointer">
                  <input
                    type="radio"
                    checked={everyone}
                    onChange={() => setEveryone(true)}
                    className="accent-[#C9A84C]"
                  />
                  <Users size={14} className="text-[#7A7A7A]" />
                  Todo el equipo
                </label>
              </div>

              {!everyone && (
                <div className="border border-[#EDE9E0] bg-white max-h-56 overflow-y-auto">
                  {employees.length === 0 ? (
                    <p className="text-[#7A7A7A] text-xs p-4">
                      No hay otros empleados registrados.
                    </p>
                  ) : (
                    employees.map((emp) => (
                      <label
                        key={emp.username}
                        className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={allowed.includes(emp.username)}
                          onChange={() => toggle(emp.username)}
                          className="accent-[#C9A84C]"
                        />
                        <span className="text-[#2C2C2C]">{emp.nombre}</span>
                        <span className="text-[#7A7A7A] text-xs">@{emp.username}</span>
                      </label>
                    ))
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2.5 text-red-600 text-xs mt-3">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#EDE9E0]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs tracking-widest uppercase font-semibold text-[#7A7A7A] hover:text-[#1B2A5E]"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || loading || (!everyone && allowed.length === 0)}
            className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Compartir
          </button>
        </div>
      </div>
    </div>
  );
}

function accionMeta(a: FileEvent["accion"]) {
  if (a === "subido") return { label: "Subió el archivo", Icon: UploadCloud, color: "text-emerald-600" };
  if (a === "modificado") return { label: "Actualizó el archivo", Icon: Pencil, color: "text-[#C9A84C]" };
  return { label: "Eliminó el archivo", Icon: Trash, color: "text-red-500" };
}

function HistoryModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const [meta, setMeta] = useState<FileMeta | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/files/history?path=${encodeURIComponent(entry.path)}`)
      .then((r) => (r.ok ? r.json() : { meta: null }))
      .then((d) => setMeta(d.meta))
      .catch(() => setMeta(null));
  }, [entry.path]);

  const eventos = meta ? [...meta.historial].sort((a, b) => b.fecha - a.fecha) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <div className="min-w-0">
            <h3 className="text-[#1B2A5E] text-lg truncate" style={{ fontFamily: "var(--font-playfair)" }}>
              Historial
            </h3>
            <p className="text-[#7A7A7A] text-xs truncate">{entry.name}</p>
          </div>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {meta === undefined ? (
            <div className="flex items-center gap-2 text-[#7A7A7A] text-sm py-6 justify-center">
              <Loader2 size={16} className="animate-spin" /> Cargando…
            </div>
          ) : meta === null ? (
            <p className="text-[#7A7A7A] text-sm">
              Este archivo no tiene historial registrado en la plataforma (pudo
              haberse subido directamente en el NAS).
            </p>
          ) : (
            <>
              <div className="bg-white border border-[#EDE9E0] p-4 mb-5 text-sm space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-[#7A7A7A]">Compartido por</span>
                  <span className="text-[#1B2A5E] font-medium">{meta.subidoPor}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#7A7A7A]">Fecha de subida</span>
                  <span className="text-[#2C2C2C]">{fmtDateTime(meta.subidoEn)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#7A7A7A]">Última modificación</span>
                  <span className="text-[#2C2C2C]">
                    {entry.modified ? fmtDateTime(entry.modified) : fmtDateTime(meta.ultimaAccion)}
                  </span>
                </div>
              </div>

              <p className="text-[#7A7A7A] text-xs tracking-widest uppercase mb-3">Línea de tiempo</p>
              <ul className="space-y-4">
                {eventos.map((ev, i) => {
                  const { label, Icon, color } = accionMeta(ev.accion);
                  return (
                    <li key={i} className="flex gap-3">
                      <div className={`mt-0.5 ${color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#2C2C2C] text-sm">
                          <span className="font-medium">{ev.usuario}</span> — {label}
                        </p>
                        <p className="text-[#7A7A7A] text-xs">{fmtDateTime(ev.fecha)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
