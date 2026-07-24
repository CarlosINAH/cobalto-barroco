"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  X,
  Loader2,
  FolderKanban,
} from "lucide-react";

interface Project {
  id: string;
  nombre: string;
  ubicacion: string;
  inicio: string;
  entrega: string;
  avance: number;
  estado: "activo" | "finalizado" | "futuro";
  desc: string;
}

type Filter = "todos" | "activo" | "finalizado" | "futuro";

const estadoColor: Record<string, string> = {
  activo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  finalizado: "bg-blue-100 text-blue-700 border-blue-200",
  futuro: "bg-amber-100 text-amber-700 border-amber-200",
};

const empty = {
  nombre: "",
  ubicacion: "",
  inicio: "",
  entrega: "",
  avance: 0,
  estado: "activo" as const,
  desc: "",
};

export default function ProyectosManager({ initial }: { initial: Project[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("todos");
  const [modal, setModal] = useState<null | { mode: "new" | "edit"; data: Partial<Project> }>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = initial.filter((p) =>
    filter === "todos" ? true : p.estado === filter,
  );

  const save = async (form: Partial<Project>) => {
    setSaving(true);
    setError("");
    try {
      const isEdit = modal?.mode === "edit";
      const res = await fetch(
        isEdit ? `/api/projects/${form.id}` : "/api/projects",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setModal(null);
      router.refresh();
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Project) => {
    if (!confirm(`¿Eliminar el proyecto "${p.nombre}"?`)) return;
    await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          {(["todos", "activo", "finalizado", "futuro"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs tracking-widest uppercase font-semibold transition-colors ${
                filter === f
                  ? "bg-[#1B2A5E] text-[#C9A84C]"
                  : "bg-white border border-[#EDE9E0] text-[#7A7A7A] hover:border-[#1B2A5E]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModal({ mode: "new", data: { ...empty } })}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#1B2A5E] px-4 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#D4B86A] transition-colors"
        >
          <Plus size={13} /> Nuevo proyecto
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#EDE9E0] py-20 text-center">
          <FolderKanban size={32} className="text-[#EDE9E0] mx-auto mb-3" />
          <p className="text-[#7A7A7A] text-sm">
            {initial.length === 0
              ? "Aún no hay proyectos. Crea el primero con «Nuevo proyecto»."
              : "No hay proyectos con ese estado."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-[#EDE9E0] p-6 hover:border-[#C9A84C]/40 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[#7A7A7A] text-xs font-mono">{p.id}</span>
                    <span
                      className={`px-2 py-0.5 text-xs border font-semibold tracking-wide ${estadoColor[p.estado]}`}
                    >
                      {p.estado}
                    </span>
                  </div>
                  <h3
                    className="text-[#1B2A5E] text-xl mb-1"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {p.nombre}
                  </h3>
                  {p.desc && <p className="text-[#7A7A7A] text-sm mb-3">{p.desc}</p>}
                  <div className="flex flex-wrap gap-4 text-[#7A7A7A] text-xs">
                    {p.ubicacion && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {p.ubicacion}
                      </span>
                    )}
                    {(p.inicio || p.entrega) && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {p.inicio || "—"} → {p.entrega || "—"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p
                      className="text-[#C9A84C] text-2xl font-bold"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      {p.avance}%
                    </p>
                    <p className="text-[#7A7A7A] text-xs uppercase tracking-wider">Avance</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setModal({ mode: "edit", data: { ...p } })}
                      className="text-[#7A7A7A] hover:text-[#1B2A5E] p-1.5"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(p)}
                      className="text-[#7A7A7A] hover:text-red-500 p-1.5"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1 bg-[#EDE9E0]">
                <div
                  className="h-1 bg-gradient-to-r from-[#1B2A5E] to-[#C9A84C]"
                  style={{ width: `${p.avance}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ProjectModal
          mode={modal.mode}
          data={modal.data}
          saving={saving}
          error={error}
          onClose={() => {
            setModal(null);
            setError("");
          }}
          onSave={save}
        />
      )}
    </>
  );
}

function ProjectModal({
  mode,
  data,
  saving,
  error,
  onClose,
  onSave,
}: {
  mode: "new" | "edit";
  data: Partial<Project>;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (f: Partial<Project>) => void;
}) {
  const [form, setForm] = useState<Partial<Project>>(data);
  const set = (k: keyof Project, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const field =
    "w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
  const label = "block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
            {mode === "new" ? "Nuevo proyecto" : "Editar proyecto"}
          </h3>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={label}>Nombre *</label>
            <input
              className={field}
              value={form.nombre || ""}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Retablo Mayor — San Miguel"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Ubicación</label>
              <input
                className={field}
                value={form.ubicacion || ""}
                onChange={(e) => set("ubicacion", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Estado</label>
              <select
                className={field}
                value={form.estado || "activo"}
                onChange={(e) => set("estado", e.target.value)}
              >
                <option value="activo">Activo</option>
                <option value="futuro">Futuro</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Inicio</label>
              <input
                className={field}
                value={form.inicio || ""}
                onChange={(e) => set("inicio", e.target.value)}
                placeholder="15 Ene 2025"
              />
            </div>
            <div>
              <label className={label}>Entrega</label>
              <input
                className={field}
                value={form.entrega || ""}
                onChange={(e) => set("entrega", e.target.value)}
                placeholder="30 Jul 2025"
              />
            </div>
          </div>
          <div>
            <label className={label}>Avance ({form.avance || 0}%)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={form.avance || 0}
              onChange={(e) => set("avance", Number(e.target.value))}
              className="w-full accent-[#C9A84C]"
            />
          </div>
          <div>
            <label className={label}>Descripción</label>
            <textarea
              className={`${field} min-h-20`}
              value={form.desc || ""}
              onChange={(e) => set("desc", e.target.value)}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs">
              {error}
            </div>
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
            onClick={() => onSave(form)}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] disabled:opacity-60"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
