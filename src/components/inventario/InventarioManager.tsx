"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, X, Loader2, Package } from "lucide-react";

interface Item {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  ubicacion: string;
  nota: string;
}

const empty = {
  nombre: "",
  categoria: "",
  cantidad: 0,
  unidad: "u",
  ubicacion: "",
  nota: "",
};

export default function InventarioManager({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | { mode: "new" | "edit"; data: Partial<Item> }>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = initial.filter(
    (i) =>
      i.nombre.toLowerCase().includes(search.toLowerCase()) ||
      i.categoria.toLowerCase().includes(search.toLowerCase()) ||
      i.ubicacion.toLowerCase().includes(search.toLowerCase()),
  );

  const save = async (form: Partial<Item>) => {
    setSaving(true);
    setError("");
    try {
      const isEdit = modal?.mode === "edit";
      const res = await fetch(isEdit ? `/api/inventory/${form.id}` : "/api/inventory", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
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

  const remove = async (i: Item) => {
    if (!confirm(`¿Eliminar "${i.nombre}" del inventario?`)) return;
    await fetch(`/api/inventory/${i.id}`, { method: "DELETE" });
    router.refresh();
  };

  const field =
    "w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
  const label = "block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar material..."
            className="w-full border border-[#EDE9E0] bg-white pl-9 pr-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <button
          onClick={() => setModal({ mode: "new", data: { ...empty } })}
          className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470]"
        >
          <Plus size={13} /> Nueva entrada
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#EDE9E0] py-20 text-center">
          <Package size={32} className="text-[#EDE9E0] mx-auto mb-3" />
          <p className="text-[#7A7A7A] text-sm">
            {initial.length === 0
              ? "Inventario vacío. Agrega el primer material con «Nueva entrada»."
              : "No hay materiales que coincidan."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#EDE9E0]">
          <div className="grid grid-cols-12 px-5 py-3 border-b border-[#EDE9E0] text-[#7A7A7A] text-xs tracking-widest uppercase">
            <div className="col-span-4">Material</div>
            <div className="col-span-2 hidden md:block">Categoría</div>
            <div className="col-span-2">Cantidad</div>
            <div className="col-span-2 hidden md:block">Ubicación</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>
          {filtered.map((i) => (
            <div
              key={i.id}
              className="grid grid-cols-12 px-5 py-3.5 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] items-center"
            >
              <div className="col-span-4 min-w-0">
                <p className="text-[#2C2C2C] text-sm truncate">{i.nombre}</p>
                {i.nota && <p className="text-[#7A7A7A] text-xs truncate">{i.nota}</p>}
              </div>
              <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm">
                {i.categoria || "—"}
              </div>
              <div className="col-span-2 text-[#1B2A5E] text-sm font-medium">
                {i.cantidad} {i.unidad}
              </div>
              <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm">
                {i.ubicacion || "—"}
              </div>
              <div className="col-span-2 flex justify-end gap-1">
                <button
                  onClick={() => setModal({ mode: "edit", data: { ...i } })}
                  className="text-[#7A7A7A] hover:text-[#1B2A5E] p-1.5"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => remove(i)}
                  className="text-[#7A7A7A] hover:text-red-500 p-1.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <ItemForm
            data={modal.data}
            mode={modal.mode}
            saving={saving}
            error={error}
            field={field}
            label={label}
            onClose={() => {
              setModal(null);
              setError("");
            }}
            onSave={save}
          />
        </div>
      )}
    </>
  );
}

function ItemForm({
  data,
  mode,
  saving,
  error,
  field,
  label,
  onClose,
  onSave,
}: {
  data: Partial<Item>;
  mode: "new" | "edit";
  saving: boolean;
  error: string;
  field: string;
  label: string;
  onClose: () => void;
  onSave: (f: Partial<Item>) => void;
}) {
  const [form, setForm] = useState<Partial<Item>>(data);
  const set = (k: keyof Item, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="bg-[#F5F2EC] w-full max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
        <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
          {mode === "new" ? "Nueva entrada de inventario" : "Editar material"}
        </h3>
        <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
          <X size={18} />
        </button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className={label}>Material *</label>
          <input
            className={field}
            value={form.nombre || ""}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="Pan de oro 22k"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Categoría</label>
            <input
              className={field}
              value={form.categoria || ""}
              onChange={(e) => set("categoria", e.target.value)}
              placeholder="Dorado"
            />
          </div>
          <div>
            <label className={label}>Ubicación</label>
            <input
              className={field}
              value={form.ubicacion || ""}
              onChange={(e) => set("ubicacion", e.target.value)}
              placeholder="Almacén A"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Cantidad</label>
            <input
              type="number"
              className={field}
              value={form.cantidad ?? 0}
              onChange={(e) => set("cantidad", Number(e.target.value))}
            />
          </div>
          <div>
            <label className={label}>Unidad</label>
            <input
              className={field}
              value={form.unidad || ""}
              onChange={(e) => set("unidad", e.target.value)}
              placeholder="u, kg, m, L…"
            />
          </div>
        </div>
        <div>
          <label className={label}>Nota</label>
          <input
            className={field}
            value={form.nota || ""}
            onChange={(e) => set("nota", e.target.value)}
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
  );
}
