"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users,
  Mail,
  Phone,
  Star,
  FolderOpen,
} from "lucide-react";

interface Project {
  id: string;
  nombre: string;
}
interface Employee {
  id: string;
  username: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: string;
  ranking: number;
  habilidades: string[];
  proyectoId: string | null;
}

const empty = {
  username: "",
  nombre: "",
  email: "",
  telefono: "",
  rol: "",
  ranking: 0,
  habilidades: [] as string[],
  proyectoId: "",
};

export default function PersonalManager({
  initial,
  projects,
}: {
  initial: Employee[];
  projects: Project[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | { mode: "new" | "edit"; data: Partial<Employee> }>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const projName = (id: string | null) =>
    projects.find((p) => p.id === id)?.nombre;

  const filtered = initial.filter(
    (e) =>
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      e.username.toLowerCase().includes(search.toLowerCase()) ||
      e.rol.toLowerCase().includes(search.toLowerCase()),
  );

  const save = async (form: Partial<Employee>) => {
    setSaving(true);
    setError("");
    try {
      const isEdit = modal?.mode === "edit";
      const res = await fetch(
        isEdit ? `/api/employees/${form.id}` : "/api/employees",
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

  const remove = async (e: Employee) => {
    if (!confirm(`¿Eliminar a "${e.nombre}"?`)) return;
    await fetch(`/api/employees/${e.id}`, { method: "DELETE" });
    router.refresh();
  };

  const rankColor = (r: number) =>
    r >= 90
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : r >= 70
        ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-[#7A7A7A] bg-[#F5F2EC] border-[#EDE9E0]";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empleado..."
            className="w-full border border-[#EDE9E0] bg-white pl-9 pr-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <button
          onClick={() => setModal({ mode: "new", data: { ...empty } })}
          className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470]"
        >
          <UserPlus size={13} /> Agregar empleado
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#EDE9E0] py-20 text-center">
          <Users size={32} className="text-[#EDE9E0] mx-auto mb-3" />
          <p className="text-[#7A7A7A] text-sm">
            {initial.length === 0
              ? "Aún no hay empleados. Da de alta al primero con «Agregar empleado» (usa su usuario del NAS)."
              : "No hay empleados que coincidan."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((e) => (
            <div key={e.id} className="bg-white border border-[#EDE9E0] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[#1B2A5E] text-base font-semibold truncate">
                    {e.nombre}
                  </h3>
                  <p className="text-[#7A7A7A] text-xs">@{e.username}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 text-xs border font-semibold ${rankColor(e.ranking)}`}
                  >
                    <Star size={10} /> {e.ranking}
                  </span>
                  <button
                    onClick={() => setModal({ mode: "edit", data: { ...e } })}
                    className="text-[#7A7A7A] hover:text-[#1B2A5E] p-1.5"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => remove(e)}
                    className="text-[#7A7A7A] hover:text-red-500 p-1.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {e.rol && <p className="text-[#2C2C2C] text-sm mt-2">{e.rol}</p>}
              <div className="mt-3 space-y-1 text-[#7A7A7A] text-xs">
                {e.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail size={11} /> {e.email}
                  </p>
                )}
                {e.telefono && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={11} /> {e.telefono}
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <FolderOpen size={11} />
                  {projName(e.proyectoId) || "Sin proyecto asignado"}
                </p>
              </div>
              {e.habilidades.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {e.habilidades.map((h) => (
                    <span
                      key={h}
                      className="bg-[#F5F2EC] border border-[#EDE9E0] text-[#7A7A7A] text-xs px-2 py-0.5"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <EmployeeModal
          mode={modal.mode}
          data={modal.data}
          projects={projects}
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

function EmployeeModal({
  mode,
  data,
  projects,
  saving,
  error,
  onClose,
  onSave,
}: {
  mode: "new" | "edit";
  data: Partial<Employee>;
  projects: Project[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (f: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    ...data,
    habilidades: (data.habilidades || []).join(", "),
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const field =
    "w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
  const label = "block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <h3
            className="text-[#1B2A5E] text-lg"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {mode === "new" ? "Agregar empleado" : "Editar empleado"}
          </h3>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Usuario del NAS *</label>
              <input
                className={field}
                value={(form.username as string) || ""}
                onChange={(e) => set("username", e.target.value)}
                placeholder="Barbara"
                disabled={mode === "edit"}
              />
            </div>
            <div>
              <label className={label}>Nombre completo</label>
              <input
                className={field}
                value={(form.nombre as string) || ""}
                onChange={(e) => set("nombre", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Correo electrónico</label>
              <input
                type="email"
                className={field}
                value={(form.email as string) || ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="empleado@correo.com"
              />
            </div>
            <div>
              <label className={label}>Teléfono</label>
              <input
                type="tel"
                className={field}
                value={(form.telefono as string) || ""}
                onChange={(e) => set("telefono", e.target.value)}
                placeholder="+52 55 0000 0000"
              />
            </div>
          </div>
          <div>
            <label className={label}>Rol / especialidad</label>
            <input
              className={field}
              value={(form.rol as string) || ""}
              onChange={(e) => set("rol", e.target.value)}
              placeholder="Restaurador — Especialista en dorado"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Proyecto asignado</label>
              <select
                className={field}
                value={(form.proyectoId as string) || ""}
                onChange={(e) => set("proyectoId", e.target.value)}
              >
                <option value="">Sin asignar</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Ranking ({(form.ranking as number) || 0})</label>
              <input
                type="range"
                min={0}
                max={100}
                value={(form.ranking as number) || 0}
                onChange={(e) => set("ranking", Number(e.target.value))}
                className="w-full accent-[#C9A84C] mt-3"
              />
            </div>
          </div>
          <div>
            <label className={label}>Habilidades (separadas por coma)</label>
            <input
              className={field}
              value={(form.habilidades as string) || ""}
              onChange={(e) => set("habilidades", e.target.value)}
              placeholder="Dorado al agua, Consolidación, Policromía"
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
