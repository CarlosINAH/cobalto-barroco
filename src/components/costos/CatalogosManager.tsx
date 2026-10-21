"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Save,
  Pencil,
  FlaskConical,
  Package,
  Coins,
  Layers,
  X,
} from "lucide-react";
import type {
  CostMaterial,
  LaborRate,
  Recipe,
  Concept,
  CostInputKind,
} from "@/lib/db";

/** Concepto con su desglose ya calculado en el servidor. */
type ConceptoView = Concept & {
  porTipo: Record<CostInputKind, number>;
};

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const money = (n: number) => mxn.format(Number.isFinite(n) ? n : 0);

type Tab = "materiales" | "recetas" | "salarios" | "conceptos";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "materiales", label: "Materiales", icon: Package },
  { id: "recetas", label: "Recetas", icon: FlaskConical },
  { id: "salarios", label: "Salarios", icon: Coins },
  { id: "conceptos", label: "Conceptos", icon: Layers },
];

const INPUT =
  "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const BTN_PRIMARY =
  "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";
const KIND_LABEL: Record<CostMaterial["kind"], string> = {
  material: "Material",
  herramienta: "Herramienta",
  equipo: "Equipo",
};

export default function CatalogosManager({
  materiales,
  recetas,
  salarios,
  conceptos,
}: {
  materiales: CostMaterial[];
  recetas: Recipe[];
  salarios: LaborRate[];
  conceptos: ConceptoView[];
}) {
  const [tab, setTab] = useState<Tab>("materiales");

  return (
    <div>
      {/* Sub-pestañas */}
      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const count =
            t.id === "materiales"
              ? materiales.length
              : t.id === "recetas"
                ? recetas.length
                : t.id === "salarios"
                  ? salarios.length
                  : conceptos.length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active
                  ? "border-[#C9A84C] text-[#1B2A5E]"
                  : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"
              }`}
            >
              <Icon size={14} />
              {t.label}
              <span className="text-[#7A7A7A] font-normal">({count})</span>
            </button>
          );
        })}
      </div>

      {tab === "materiales" && <Materiales initial={materiales} />}
      {tab === "salarios" && <Salarios initial={salarios} />}
      {tab === "recetas" && <Recetas recetas={recetas} />}
      {tab === "conceptos" && <Conceptos conceptos={conceptos} />}
    </div>
  );
}

// ─── Materiales (CRUD) ───────────────────────────────────────────────────────
function Materiales({ initial }: { initial: CostMaterial[] }) {
  const [items, setItems] = useState(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nuevo, setNuevo] = useState({
    nombre: "",
    kind: "material" as CostMaterial["kind"],
    categoria: "",
    precio: "",
    unidad: "",
    url: "",
  });

  const categorias = useMemo(
    () => [...new Set(items.map((m) => m.categoria).filter(Boolean))].sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (m) =>
        (!cat || m.categoria === cat) &&
        (!needle || m.nombre.toLowerCase().includes(needle)),
    );
  }, [items, q, cat]);

  async function savePrecio(id: string) {
    const precio = Number(draft);
    if (!Number.isFinite(precio)) return;
    setBusy(true);
    const res = await fetch(`/api/costos/materiales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precio }),
    });
    setBusy(false);
    if (res.ok) {
      const { material } = await res.json();
      setItems((xs) => xs.map((m) => (m.id === id ? material : m)));
      setEditing(null);
    }
  }

  async function crear() {
    if (!nuevo.nombre.trim()) return;
    setBusy(true);
    const res = await fetch("/api/costos/materiales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nuevo, precio: Number(nuevo.precio) || 0 }),
    });
    setBusy(false);
    if (res.ok) {
      const { material } = await res.json();
      setItems((xs) => [...xs, material]);
      setAdding(false);
      setNuevo({ nombre: "", kind: "material", categoria: "", precio: "", unidad: "", url: "" });
    }
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este material del catálogo?")) return;
    const res = await fetch(`/api/costos/materiales/${id}`, { method: "DELETE" });
    if (res.ok) setItems((xs) => xs.filter((m) => m.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar material…"
            className="w-full border border-[#EDE9E0] bg-white pl-9 pr-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={() => setAdding((v) => !v)} className={BTN_PRIMARY}>
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {adding && (
        <div className="bg-white border border-[#EDE9E0] p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className={INPUT} placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <select className={INPUT} value={nuevo.kind} onChange={(e) => setNuevo({ ...nuevo, kind: e.target.value as CostMaterial["kind"] })}>
            <option value="material">Material</option>
            <option value="herramienta">Herramienta</option>
            <option value="equipo">Equipo</option>
          </select>
          <input className={INPUT} placeholder="Categoría" value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })} list="cats" />
          <datalist id="cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          <input className={INPUT} type="number" step="0.01" placeholder="Precio" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} />
          <input className={INPUT} placeholder="Unidad (p. ej. 1 L)" value={nuevo.unidad} onChange={(e) => setNuevo({ ...nuevo, unidad: e.target.value })} />
          <input className={INPUT} placeholder="URL de compra" value={nuevo.url} onChange={(e) => setNuevo({ ...nuevo, url: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button onClick={crear} disabled={busy} className={BTN_PRIMARY}><Save size={14} /> Guardar</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#EDE9E0] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-4 py-3 font-semibold">Material</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold text-right">Precio</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/50">
                <td className="px-4 py-2.5 text-[#2C2C2C]">
                  {m.url ? (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#C9A84C] hover:underline">{m.nombre}</a>
                  ) : (
                    m.nombre
                  )}
                </td>
                <td className="px-4 py-2.5 text-[#7A7A7A]">{KIND_LABEL[m.kind]}</td>
                <td className="px-4 py-2.5 text-[#7A7A7A]">{m.categoria || "—"}</td>
                <td className="px-4 py-2.5 text-right">
                  {editing === m.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input autoFocus type="number" step="0.01" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePrecio(m.id)} className="w-24 border border-[#C9A84C] px-2 py-1 text-right text-sm focus:outline-none" />
                      <button onClick={() => savePrecio(m.id)} disabled={busy} className="text-[#1B2A5E] hover:text-[#C9A84C]"><Save size={15} /></button>
                      <button onClick={() => setEditing(null)} className="text-[#7A7A7A] hover:text-red-500"><X size={15} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditing(m.id); setDraft(String(m.precio)); }} className="inline-flex items-center gap-1.5 font-medium text-[#1B2A5E] hover:text-[#C9A84C] data-label">
                      {money(m.precio)} <Pencil size={12} className="opacity-40" />
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => borrar(m.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-[#7A7A7A]">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">{filtered.length} de {items.length} materiales. Editar un precio recalcula recetas y conceptos que lo usan.</p>
    </div>
  );
}

// ─── Salarios (CRUD) ─────────────────────────────────────────────────────────
function Salarios({ initial }: { initial: LaborRate[] }) {
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nuevo, setNuevo] = useState({ rol: "", jornada: "" });

  async function patch(id: string, campo: keyof LaborRate, valor: number) {
    const res = await fetch(`/api/costos/salarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    });
    if (res.ok) {
      const { salario } = await res.json();
      setItems((xs) => xs.map((s) => (s.id === id ? salario : s)));
    }
  }

  async function crear() {
    if (!nuevo.rol.trim()) return;
    setBusy(true);
    const res = await fetch("/api/costos/salarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol: nuevo.rol, jornada: Number(nuevo.jornada) || 0 }),
    });
    setBusy(false);
    if (res.ok) {
      const { salario } = await res.json();
      setItems((xs) => [...xs, salario]);
      setAdding(false);
      setNuevo({ rol: "", jornada: "" });
    }
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este rol?")) return;
    const res = await fetch(`/api/costos/salarios/${id}`, { method: "DELETE" });
    if (res.ok) setItems((xs) => xs.filter((s) => s.id !== id));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[#7A7A7A]">Tarifa de mano de obra por rol (MXN). La jornada es la base del costo de mano de obra en los conceptos.</p>
        <button onClick={() => setAdding((v) => !v)} className={BTN_PRIMARY}><Plus size={14} /> Nuevo rol</button>
      </div>
      {adding && (
        <div className="bg-white border border-[#EDE9E0] p-4 mb-4 flex flex-wrap gap-3 items-end">
          <input className={INPUT + " flex-1 min-w-[200px]"} placeholder="Rol" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })} />
          <input className={INPUT + " w-40"} type="number" placeholder="Jornada (8h)" value={nuevo.jornada} onChange={(e) => setNuevo({ ...nuevo, jornada: e.target.value })} />
          <button onClick={crear} disabled={busy} className={BTN_PRIMARY}><Save size={14} /> Guardar</button>
          <button onClick={() => setAdding(false)} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
        </div>
      )}
      <div className="bg-white border border-[#EDE9E0] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold text-right">Jornada (8h)</th>
              <th className="px-4 py-3 font-semibold text-right">Hora</th>
              <th className="px-4 py-3 font-semibold text-right">Semana</th>
              <th className="px-4 py-3 font-semibold text-right">Mes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/50">
                <td className="px-4 py-2.5 text-[#2C2C2C] font-medium">{s.rol}</td>
                <td className="px-4 py-2.5 text-right">
                  <input defaultValue={s.jornada} type="number" onBlur={(e) => { const v = Number(e.target.value); if (v !== s.jornada) patch(s.id, "jornada", v); }} className="w-24 border border-[#EDE9E0] px-2 py-1 text-right text-sm focus:outline-none focus:border-[#C9A84C] data-label" />
                </td>
                <td className="px-4 py-2.5 text-right text-[#7A7A7A] data-label">{money(s.hora)}</td>
                <td className="px-4 py-2.5 text-right text-[#7A7A7A] data-label">{money(s.semana)}</td>
                <td className="px-4 py-2.5 text-right text-[#7A7A7A] data-label">{money(s.mes)}</td>
                <td className="px-4 py-2.5 text-right"><button onClick={() => borrar(s.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-[#7A7A7A]">Sin salarios aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Recetas (lectura, costo en vivo) ────────────────────────────────────────
function Recetas({ recetas }: { recetas: Recipe[] }) {
  if (recetas.length === 0)
    return <Empty>No hay recetas aún. Impórtalas desde el Excel o créalas.</Empty>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {recetas.map((r) => (
        <div key={r.id} className="bg-white border border-[#EDE9E0] p-5">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>{r.nombre}</h3>
            <span className="data-label text-[#C9A84C] font-semibold">{money(r.costo)}</span>
          </div>
          <p className="text-xs text-[#7A7A7A] mb-3">Rendimiento: {r.rendimiento || "—"}</p>
          <table className="w-full text-xs">
            <tbody>
              {r.componentes.map((c, i) => (
                <tr key={i} className="border-t border-[#F5F2EC]">
                  <td className="py-1.5 text-[#2C2C2C]">{c.nombre}</td>
                  <td className="py-1.5 text-right text-[#7A7A7A] data-label">{money(c.precio)}</td>
                  <td className="py-1.5 text-right text-[#7A7A7A] data-label">×{c.cantidad}</td>
                  <td className="py-1.5 text-right text-[#2C2C2C] data-label">{money(c.precio * c.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Conceptos (lectura, P.U. en vivo) ───────────────────────────────────────
function Conceptos({ conceptos }: { conceptos: ConceptoView[] }) {
  if (conceptos.length === 0)
    return (
      <Empty>
        Aún no hay conceptos. El constructor de matrices de P.U. (elegir insumos
        de los catálogos y fijar rendimientos) llega en la Fase 3.
      </Empty>
    );
  return (
    <div className="space-y-3">
      {conceptos.map((c) => (
        <div key={c.id} className="bg-white border border-[#EDE9E0] p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
              <span className="data-label text-[#7A7A7A] mr-2">{c.clave || "—"}</span>
              {c.concepto || c.descripcion || "Concepto"}
            </h3>
            <span className="data-label text-[#C9A84C] font-bold">{money(c.pu)} / {c.unidad || "u"}</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-[#7A7A7A] data-label">
            <span>Material {money(c.porTipo.material)}</span>
            <span>Herr. {money(c.porTipo.herramienta)}</span>
            <span>Equipo {money(c.porTipo.equipo)}</span>
            <span>M.O. {money(c.porTipo.mano_obra)}</span>
            <span>Recetas {money(c.porTipo.receta)}</span>
            <span className="text-[#1B2A5E]">CD {money(c.costoDirecto)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#EDE9E0] py-16 px-6 text-center text-sm text-[#7A7A7A]">
      {children}
    </div>
  );
}
