"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Truck,
  Mail,
  Phone,
  MapPin,
  User,
  Tag,
} from "lucide-react";

interface Supplier {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  categoria: string;
  direccion: string;
  nota: string;
}

const empty = {
  nombre: "",
  contacto: "",
  telefono: "",
  email: "",
  categoria: "",
  direccion: "",
  nota: "",
};

export default function ProveedoresManager({ initial }: { initial: Supplier[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | { mode: "new" | "edit"; data: Partial<Supplier> }>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = initial.filter(
    (s) =>
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.categoria.toLowerCase().includes(search.toLowerCase()) ||
      s.contacto.toLowerCase().includes(search.toLowerCase()),
  );

  const save = async (form: Partial<Supplier>) => {
    setSaving(true);
    setError("");
    try {
      const isEdit = modal?.mode === "edit";
      const res = await fetch(
        isEdit ? `/api/suppliers/${form.id}` : "/api/suppliers",
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

  const remove = async (s: Supplier) => {
    if (!confirm(`¿Eliminar al proveedor "${s.nombre}"?`)) return;
    await fetch(`/api/suppliers/${s.id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proveedor..."
            className="w-full border border-[#EDE9E0] bg-white pl-9 pr-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <button
          onClick={() => setModal({ mode: "new", data: { ...empty } })}
          className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470]"
        >
          <Plus size={13} /> Agregar proveedor
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#EDE9E0] py-20 text-center">
          <Truck size={32} className="text-[#EDE9E0] mx-auto mb-3" />
          <p className="text-[#7A7A7A] text-sm">
            {initial.length === 0
              ? "Aún no hay proveedores. Agrega el primero con «Agregar proveedor»."
              : "No hay proveedores que coincidan."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white border border-[#EDE9E0] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[#1B2A5E] text-base font-semibold truncate">{s.nombre}</h3>
                  {s.categoria && (
                    <span className="inline-flex items-center gap-1 text-[#7A7A7A] text-xs mt-0.5">
                      <Tag size={10} /> {s.categoria}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setModal({ mode: "edit", data: { ...s } })}
                    className="text-[#7A7A7A] hover:text-[#1B2A5E] p-1.5"
                  >
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => remove(s)} className="text-[#7A7A7A] hover:text-red-500 p-1.5">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-[#7A7A7A] text-xs">
                {s.contacto && (
                  <p className="flex items-center gap-1.5"><User size={11} /> {s.contacto}</p>
                )}
                {s.telefono && (
                  <p className="flex items-center gap-1.5"><Phone size={11} /> {s.telefono}</p>
                )}
                {s.email && (
                  <p className="flex items-center gap-1.5"><Mail size={11} /> {s.email}</p>
                )}
                {s.direccion && (
                  <p className="flex items-start gap-1.5"><MapPin size={11} className="mt-0.5" /> {s.direccion}</p>
                )}
              </div>
              {s.nota && <p className="text-[#2C2C2C] text-sm mt-3 border-t border-[#EDE9E0] pt-2">{s.nota}</p>}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <SupplierModal
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

function SupplierModal({
  mode,
  data,
  saving,
  error,
  onClose,
  onSave,
}: {
  mode: "new" | "edit";
  data: Partial<Supplier>;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (f: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...data });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const field =
    "w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
  const label = "block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
            {mode === "new" ? "Agregar proveedor" : "Editar proveedor"}
          </h3>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={label}>Nombre / empresa *</label>
            <input className={field} value={(form.nombre as string) || ""} onChange={(e) => set("nombre", e.target.value)} placeholder="Materiales del Centro S.A." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Categoría</label>
              <input className={field} value={(form.categoria as string) || ""} onChange={(e) => set("categoria", e.target.value)} placeholder="Pinturas, Dorado…" />
            </div>
            <div>
              <label className={label}>Persona de contacto</label>
              <input className={field} value={(form.contacto as string) || ""} onChange={(e) => set("contacto", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Teléfono</label>
              <input className={field} type="tel" value={(form.telefono as string) || ""} onChange={(e) => set("telefono", e.target.value)} placeholder="+52 55 0000 0000" />
            </div>
            <div>
              <label className={label}>Correo</label>
              <input className={field} type="email" value={(form.email as string) || ""} onChange={(e) => set("email", e.target.value)} placeholder="ventas@proveedor.com" />
            </div>
          </div>
          <div>
            <label className={label}>Dirección</label>
            <input className={field} value={(form.direccion as string) || ""} onChange={(e) => set("direccion", e.target.value)} />
          </div>
          <div>
            <label className={label}>Nota</label>
            <textarea className={`${field} resize-none`} rows={2} value={(form.nota as string) || ""} onChange={(e) => set("nota", e.target.value)} placeholder="Condiciones, tiempos de entrega…" />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs">{error}</div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#EDE9E0]">
          <button onClick={onClose} className="px-4 py-2.5 text-xs tracking-widest uppercase font-semibold text-[#7A7A7A] hover:text-[#1B2A5E]">
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
