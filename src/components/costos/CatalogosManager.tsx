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
  RecipeComponent,
  Concept,
  ConceptInput,
  CostInputKind,
} from "@/lib/db";
import { buildCatalogs, conceptBreakdown } from "@/lib/pu";

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
      {tab === "recetas" && <Recetas initial={recetas} materiales={materiales} />}
      {tab === "conceptos" && (
        <Conceptos
          initial={conceptos}
          materiales={materiales}
          recetas={recetas}
          salarios={salarios}
        />
      )}
    </div>
  );
}

// ─── Materiales (CRUD) ───────────────────────────────────────────────────────
/** Campos editables de un material (todo menos los de sistema). */
type MatDraft = {
  nombre: string;
  kind: CostMaterial["kind"];
  categoria: string;
  precio: string;
  unidad: string;
  url: string;
  nota: string;
};

function Materiales({ initial }: { initial: CostMaterial[] }) {
  const [items, setItems] = useState(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<MatDraft | null>(null);
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

  function startEdit(m: CostMaterial) {
    setEditing(m.id);
    setDraft({
      nombre: m.nombre,
      kind: m.kind,
      categoria: m.categoria || "",
      precio: String(m.precio),
      unidad: m.unidad || "",
      url: m.url || "",
      nota: m.nota || "",
    });
  }

  async function saveEdit(id: string) {
    if (!draft || !draft.nombre.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/costos/materiales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: draft.nombre,
        kind: draft.kind,
        categoria: draft.categoria,
        precio: Number(draft.precio) || 0,
        unidad: draft.unidad,
        url: draft.url,
        nota: draft.nota,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const { material } = await res.json();
      setItems((xs) => xs.map((m) => (m.id === id ? material : m)));
      setEditing(null);
      setDraft(null);
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
            {filtered.map((m) =>
              editing === m.id && draft ? (
                <tr key={m.id} className="border-b border-[#F5F2EC] bg-[#F5F2EC]/40">
                  <td colSpan={5} className="px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="text-xs text-[#7A7A7A]">Nombre
                        <input className={INPUT} value={draft.nombre} onChange={(e) => setDraft({ ...draft, nombre: e.target.value })} />
                      </label>
                      <label className="text-xs text-[#7A7A7A]">Tipo
                        <select className={INPUT} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as CostMaterial["kind"] })}>
                          <option value="material">Material</option>
                          <option value="herramienta">Herramienta</option>
                          <option value="equipo">Equipo</option>
                        </select>
                      </label>
                      <label className="text-xs text-[#7A7A7A]">Categoría
                        <input className={INPUT} value={draft.categoria} onChange={(e) => setDraft({ ...draft, categoria: e.target.value })} list="cats" />
                      </label>
                      <label className="text-xs text-[#7A7A7A]">Precio (MXN)
                        <input className={INPUT} type="number" step="0.01" value={draft.precio} onChange={(e) => setDraft({ ...draft, precio: e.target.value })} />
                      </label>
                      <label className="text-xs text-[#7A7A7A]">Unidad
                        <input className={INPUT} placeholder="p. ej. 1 L" value={draft.unidad} onChange={(e) => setDraft({ ...draft, unidad: e.target.value })} />
                      </label>
                      <label className="text-xs text-[#7A7A7A]">URL de compra
                        <input className={INPUT} type="url" placeholder="https://…" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
                      </label>
                      <label className="text-xs text-[#7A7A7A] sm:col-span-2 lg:col-span-3">Nota
                        <input className={INPUT} placeholder="Observaciones (p. ej. enlace caducado, proveedor alterno…)" value={draft.nota} onChange={(e) => setDraft({ ...draft, nota: e.target.value })} />
                      </label>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => saveEdit(m.id)} disabled={busy} className={BTN_PRIMARY}><Save size={14} /> Guardar</button>
                      <button onClick={() => { setEditing(null); setDraft(null); }} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={m.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/50">
                  <td className="px-4 py-2.5 text-[#2C2C2C]">
                    {m.url ? (
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#C9A84C] hover:underline">{m.nombre}</a>
                    ) : (
                      m.nombre
                    )}
                    {m.nota && <span className="block text-xs text-[#7A7A7A] mt-0.5">{m.nota}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-[#7A7A7A]">{KIND_LABEL[m.kind]}</td>
                  <td className="px-4 py-2.5 text-[#7A7A7A]">{m.categoria || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-[#1B2A5E] data-label">{money(m.precio)}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(m)} className="text-[#7A7A7A] hover:text-[#1B2A5E] mr-3" title="Editar material"><Pencil size={15} /></button>
                    <button onClick={() => borrar(m.id)} className="text-[#7A7A7A] hover:text-red-500" title="Eliminar"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ),
            )}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-[#7A7A7A]">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">{filtered.length} de {items.length} materiales. El lapicito edita todos los datos (nombre, tipo, categoría, precio, unidad, enlace y nota). Cambiar el precio recalcula recetas y conceptos que lo usan.</p>
    </div>
  );
}

// ─── Salarios (CRUD) ─────────────────────────────────────────────────────────
function Salarios({ initial }: { initial: LaborRate[] }) {
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nuevo, setNuevo] = useState({ rol: "", jornada: "" });

  async function patch(id: string, campos: Partial<LaborRate>) {
    const res = await fetch(`/api/costos/salarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
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
        <p className="text-sm text-[#7A7A7A]">Tarifa de mano de obra por rol (MXN). Edita rol, jornada, hora, semana y mes; la jornada es la base del costo de mano de obra en los conceptos.</p>
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
                <td className="px-4 py-2.5">
                  <input key={`rol-${s.id}-${s.rol}`} defaultValue={s.rol} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.rol) patch(s.id, { rol: v }); }} className="w-full min-w-[160px] border border-[#EDE9E0] px-2 py-1 text-sm text-[#2C2C2C] font-medium focus:outline-none focus:border-[#C9A84C]" />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <input key={`j-${s.id}-${s.jornada}`} defaultValue={s.jornada} type="number" step="0.01" onBlur={(e) => { const v = Number(e.target.value); if (v !== s.jornada) patch(s.id, { jornada: v }); }} className="w-24 border border-[#EDE9E0] px-2 py-1 text-right text-sm focus:outline-none focus:border-[#C9A84C] data-label" />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <input key={`h-${s.id}-${s.hora}`} defaultValue={s.hora} type="number" step="0.01" onBlur={(e) => { const v = Number(e.target.value); if (v !== s.hora) patch(s.id, { hora: v }); }} className="w-24 border border-[#EDE9E0] px-2 py-1 text-right text-sm focus:outline-none focus:border-[#C9A84C] data-label" />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <input key={`sem-${s.id}-${s.semana}`} defaultValue={s.semana} type="number" step="0.01" onBlur={(e) => { const v = Number(e.target.value); if (v !== s.semana) patch(s.id, { semana: v }); }} className="w-24 border border-[#EDE9E0] px-2 py-1 text-right text-sm focus:outline-none focus:border-[#C9A84C] data-label" />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <input key={`mes-${s.id}-${s.mes}`} defaultValue={s.mes} type="number" step="0.01" onBlur={(e) => { const v = Number(e.target.value); if (v !== s.mes) patch(s.id, { mes: v }); }} className="w-24 border border-[#EDE9E0] px-2 py-1 text-right text-sm focus:outline-none focus:border-[#C9A84C] data-label" />
                </td>
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

// ─── Recetas (procesos de restauración; costo por cantidad a preparar) ───────
/** Extrae la cantidad y la unidad del rendimiento ("950 ML" → 950, "ML"). */
function parseRend(r: string): { qty: number; unit: string } {
  const m = r.match(/([\d]+(?:[.,][\d]+)?)\s*(.*)$/);
  const qty = m ? parseFloat(m[1].replace(",", ".")) : 0;
  return { qty: qty > 0 ? qty : 1, unit: (m?.[2] || "").trim() };
}

function Recetas({ initial, materiales }: { initial: Recipe[]; materiales: CostMaterial[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);

  async function borrar(id: string) {
    if (!confirm("¿Eliminar esta receta?")) return;
    if ((await fetch(`/api/costos/recetas/${id}`, { method: "DELETE" })).ok)
      setItems((xs) => xs.filter((r) => r.id !== id));
  }
  function onSaved(r: Recipe) {
    setItems((xs) => (xs.some((x) => x.id === r.id) ? xs.map((x) => (x.id === r.id ? r : x)) : [...xs, r]));
    setEditing(null); setCreating(false);
  }

  if (creating || editing)
    return <RecetaEditor receta={editing} materiales={materiales} onCancel={() => { setEditing(null); setCreating(false); }} onSaved={onSaved} />;

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-4">
        <p className="text-sm text-[#7A7A7A]">Procesos y soluciones de restauración (adhesivos, barnices, ceras, consolidantes…). El costo se calcula según la cantidad que vayas a preparar.</p>
        <button onClick={() => setCreating(true)} className={BTN_PRIMARY}><Plus size={14} /> Nueva receta</button>
      </div>
      {items.length === 0 ? (
        <Empty>No hay recetas aún. Crea la primera con “Nueva receta”.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((r) => (
            <RecetaCard key={r.id} receta={r} onEdit={() => setEditing(r)} onDelete={() => borrar(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecetaCard({ receta: r, onEdit, onDelete }: { receta: Recipe; onEdit: () => void; onDelete: () => void }) {
  const { qty, unit } = parseRend(r.rendimiento || "");
  const porUnidad = r.costo / qty;
  const [prep, setPrep] = useState(String(qty));
  const cant = Number(prep) || 0;
  return (
    <div className="bg-white border border-[#EDE9E0] p-5">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>{r.nombre}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><Pencil size={14} /></button>
          <button onClick={onDelete} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button>
        </div>
      </div>
      <p className="text-xs text-[#7A7A7A] mb-3 data-label">Lote {r.rendimiento || "—"} · {money(r.costo)} · {money(porUnidad)}/{unit || "u"}</p>
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
      {/* Calculadora: costo según cantidad a preparar */}
      <div className="mt-3 pt-3 border-t border-[#EDE9E0] flex items-center gap-2 text-sm">
        <span className="text-xs text-[#7A7A7A] uppercase tracking-wider">Preparar</span>
        <input type="number" step="0.01" value={prep} onChange={(e) => setPrep(e.target.value)} className="w-20 border border-[#EDE9E0] px-2 py-1 text-right text-sm focus:outline-none focus:border-[#C9A84C] data-label" />
        <span className="text-xs text-[#7A7A7A]">{unit || "u"} =</span>
        <span className="data-label text-[#C9A84C] font-bold ml-auto">{money(cant * porUnidad)}</span>
      </div>
    </div>
  );
}

function RecetaEditor({
  receta, materiales, onCancel, onSaved,
}: {
  receta: Recipe | null;
  materiales: CostMaterial[];
  onCancel: () => void;
  onSaved: (r: Recipe) => void;
}) {
  const parsed = parseRend(receta?.rendimiento || "1 L");
  const [nombre, setNombre] = useState(receta?.nombre ?? "");
  const [rendCant, setRendCant] = useState(String(parsed.qty));
  const [rendUnit, setRendUnit] = useState(parsed.unit || "L");
  const [comps, setComps] = useState<RecipeComponent[]>(receta?.componentes ?? []);
  const [nuevo, setNuevo] = useState({ materialId: "", nombre: "", unidad: "", precio: "", cantidad: "1" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const costo = comps.reduce((a, c) => a + c.precio * c.cantidad, 0);

  function pickMaterial(id: string) {
    const m = materiales.find((x) => x.id === id);
    setNuevo((n) => ({ ...n, materialId: id, nombre: m?.nombre ?? n.nombre, unidad: m?.unidad ?? n.unidad, precio: m ? String(m.precio) : n.precio }));
  }
  function addComp() {
    if (!nuevo.nombre.trim()) return;
    setComps((xs) => [...xs, {
      materialId: nuevo.materialId || null, recipeId: null,
      nombre: nuevo.nombre.trim(), unidad: nuevo.unidad.trim(),
      precio: Number(nuevo.precio) || 0, cantidad: Number(nuevo.cantidad) || 0,
    }]);
    setNuevo({ materialId: "", nombre: "", unidad: "", precio: "", cantidad: "1" });
  }

  async function guardar() {
    if (!nombre.trim()) { setError("Ponle nombre a la receta."); return; }
    setBusy(true); setError("");
    const payload = {
      nombre, rendimiento: `${rendCant} ${rendUnit}`.trim(), unidad: rendUnit, componentes: comps,
    };
    const res = await fetch(receta ? `/api/costos/recetas/${receta.id}` : "/api/costos/recetas", {
      method: receta ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) onSaved((await res.json()).receta);
    else setError("No se pudo guardar.");
  }

  return (
    <div className="bg-white border border-[#EDE9E0] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>{receta ? "Editar receta" : "Nueva receta"}</h3>
        <button onClick={onCancel} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={18} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <input className={INPUT + " sm:col-span-2"} placeholder="Nombre (p. ej. AGUA COLA 5%)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <label className="text-xs text-[#7A7A7A]">Rinde (cantidad)<input className={INPUT} type="number" step="0.01" value={rendCant} onChange={(e) => setRendCant(e.target.value)} /></label>
        <label className="text-xs text-[#7A7A7A]">Unidad<input className={INPUT} placeholder="L, ML, KG…" value={rendUnit} onChange={(e) => setRendUnit(e.target.value)} /></label>
      </div>

      <div className="border border-[#EDE9E0] overflow-x-auto mb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0] bg-[#F5F2EC]/60">
              <th className="px-3 py-2 font-semibold">Componente</th>
              <th className="px-3 py-2 font-semibold text-right">Precio</th>
              <th className="px-3 py-2 font-semibold text-right">Cantidad</th>
              <th className="px-3 py-2 font-semibold text-right">Importe</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {comps.map((c, idx) => (
              <tr key={idx} className="border-b border-[#F5F2EC]">
                <td className="px-3 py-2 text-[#2C2C2C]">{c.nombre} {c.unidad && <span className="text-[#7A7A7A] text-xs">({c.unidad})</span>}</td>
                <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{money(c.precio)}</td>
                <td className="px-3 py-2 text-right data-label">
                  <input type="number" step="0.0001" defaultValue={c.cantidad} onBlur={(e) => { const v = Number(e.target.value) || 0; setComps((xs) => xs.map((x, j) => (j === idx ? { ...x, cantidad: v } : x))); }} className="w-20 border border-[#EDE9E0] px-2 py-1 text-right focus:outline-none focus:border-[#C9A84C]" />
                </td>
                <td className="px-3 py-2 text-right data-label text-[#2C2C2C]">{money(c.precio * c.cantidad)}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => setComps((xs) => xs.filter((_, j) => j !== idx))} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {comps.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-[#7A7A7A] text-sm">Agrega componentes abajo.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Agregar componente: del catálogo o manual */}
      <div className="grid gap-2 sm:grid-cols-6 items-end mb-5">
        <select value={nuevo.materialId} onChange={(e) => pickMaterial(e.target.value)} className={INPUT + " sm:col-span-2"}>
          <option value="">Del catálogo (opcional)…</option>
          {materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre} · {money(m.precio)}</option>)}
        </select>
        <input className={INPUT} placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, materialId: "", nombre: e.target.value })} />
        <input className={INPUT} placeholder="Unidad" value={nuevo.unidad} onChange={(e) => setNuevo({ ...nuevo, unidad: e.target.value })} />
        <input className={INPUT} type="number" step="0.01" placeholder="Precio" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} />
        <div className="flex gap-2">
          <input className={INPUT + " w-20"} type="number" step="0.0001" placeholder="Cant." value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} />
          <button onClick={addComp} className={BTN_PRIMARY}><Plus size={14} /></button>
        </div>
      </div>

      <div className="bg-[#1B2A5E] text-[#F5F2EC] p-4 flex items-center justify-between mb-5">
        <span className="text-xs text-[#F5F2EC]/70 data-label">Costo del lote ({rendCant} {rendUnit})</span>
        <span className="text-[#C9A84C] font-bold text-lg data-label">{money(costo)}</span>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="flex gap-2">
        <button onClick={guardar} disabled={busy} className={BTN_PRIMARY}><Save size={14} /> {receta ? "Guardar cambios" : "Crear receta"}</button>
        <button onClick={onCancel} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
      </div>
    </div>
  );
}

// ─── Conceptos (constructor de matrices de P.U.) ─────────────────────────────
const KIND_OPTS: { value: CostInputKind; label: string }[] = [
  { value: "material", label: "Material" },
  { value: "herramienta", label: "Herramienta" },
  { value: "equipo", label: "Equipo" },
  { value: "receta", label: "Receta" },
  { value: "mano_obra", label: "Mano de obra" },
];

// Clave automática: FASE[-BIEN]-###. DOC/PRE son generales (sin bien); REST
// lleva el tipo de bien. El consecutivo continúa el último del mismo prefijo.
const FASES: { code: string; label: string; bien: boolean }[] = [
  { code: "DOC", label: "Documentación", bien: false },
  { code: "PRE", label: "Preliminares", bien: false },
  { code: "REST", label: "Restauración", bien: true },
];
const TIPOS_BIEN: { code: string; label: string }[] = [
  { code: "RET", label: "Retablo" },
  { code: "PIN", label: "Pintura de caballete" },
  { code: "ESC", label: "Escultura" },
  { code: "MUR", label: "Mural" },
  { code: "POR", label: "Portón / puerta" },
  { code: "ORN", label: "Orfebrería / metal" },
  { code: "MOB", label: "Mobiliario" },
];

// Equivalencia de tiempo ↔ fracción de jornada (1 jornada = 8 h), igual que la
// tabla del Excel de P.U.
const JORNADA_EQUIV: { label: string; jor: number }[] = [
  { label: "8 h", jor: 1 },
  { label: "4 h", jor: 0.5 },
  { label: "2 h", jor: 0.25 },
  { label: "1 h", jor: 0.125 },
  { label: "30 min", jor: 0.0625 },
  { label: "15 min", jor: 0.0313 },
];

// Orden de los insumos dentro del concepto: material, herramienta, equipo,
// mano de obra, receta (como los organiza el cliente).
const KIND_RANK: Record<CostInputKind, number> = {
  material: 0, herramienta: 1, equipo: 2, mano_obra: 3, receta: 4,
};
function ordenarInsumos(xs: ConceptInput[]): ConceptInput[] {
  return [...xs].sort((a, b) => (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9));
}

/** Siguiente clave libre de un prefijo (p. ej. "REST-ESC" → "REST-ESC-015"). */
function nextClave(prefix: string, claves: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d{1,4})$`, "i");
  let max = 0;
  for (const c of claves) {
    const m = (c || "").trim().match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function Conceptos({
  initial,
  materiales,
  recetas,
  salarios,
}: {
  initial: ConceptoView[];
  materiales: CostMaterial[];
  recetas: Recipe[];
  salarios: LaborRate[];
}) {
  const catalogs = useMemo(
    () => buildCatalogs({ costMaterials: materiales, recipes: recetas, laborRates: salarios }),
    [materiales, recetas, salarios],
  );
  const toView = (c: Concept): ConceptoView => {
    const b = conceptBreakdown(c, catalogs);
    return { ...c, costoDirecto: b.costoDirecto, pu: b.pu, porTipo: b.porTipo };
  };

  const [items, setItems] = useState<ConceptoView[]>(initial);
  const [editing, setEditing] = useState<Concept | null>(null); // objeto en edición
  const [creating, setCreating] = useState(false);
  const [cq, setCq] = useState("");
  const [cmat, setCmat] = useState("");

  // Materiales a intervenir presentes (para filtrar/agrupar conceptos).
  const matsInterv = useMemo(
    () => [...new Set(items.map((c) => c.materialIntervencion).filter(Boolean))].sort() as string[],
    [items],
  );
  const visibles = useMemo(() => {
    const nq = cq.trim().toLowerCase();
    return items.filter(
      (c) =>
        (!cmat || c.materialIntervencion === cmat) &&
        (!nq || `${c.clave} ${c.concepto} ${c.descripcion} ${c.materialIntervencion || ""}`.toLowerCase().includes(nq)),
    );
  }, [items, cq, cmat]);

  function onSaved(c: Concept) {
    const v = toView(c);
    setItems((xs) => (xs.some((x) => x.id === v.id) ? xs.map((x) => (x.id === v.id ? v : x)) : [...xs, v]));
    setEditing(null);
    setCreating(false);
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este concepto?")) return;
    const res = await fetch(`/api/costos/conceptos/${id}`, { method: "DELETE" });
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
  }

  if (creating || editing) {
    return (
      <ConceptoEditor
        concept={editing}
        materiales={materiales}
        recetas={recetas}
        salarios={salarios}
        catalogs={catalogs}
        existingClaves={items.map((c) => c.clave)}
        onCancel={() => { setEditing(null); setCreating(false); }}
        onSaved={onSaved}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[#7A7A7A]">Conceptos de obra reutilizables. Cada uno es una matriz de P.U.: insumos × rendimiento → costo directo → P.U.</p>
        <button onClick={() => setCreating(true)} className={BTN_PRIMARY}><Plus size={14} /> Nuevo concepto</button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
            <input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Buscar concepto…" className={INPUT + " pl-9 w-full"} />
          </div>
          {matsInterv.length > 0 && (
            <select value={cmat} onChange={(e) => setCmat(e.target.value)} className={INPUT + " w-56"}>
              <option value="">Todos los materiales a intervenir</option>
              {matsInterv.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <span className="text-xs text-[#7A7A7A]">{visibles.length} de {items.length}</span>
        </div>
      )}
      {items.length === 0 ? (
        <Empty>Aún no hay conceptos. Crea el primero con “Nuevo concepto”.</Empty>
      ) : visibles.length === 0 ? (
        <Empty>Ningún concepto coincide con el filtro.</Empty>
      ) : (
        <div className="space-y-3">
          {visibles.map((c) => (
            <div key={c.id} className="bg-white border border-[#EDE9E0] p-5 group">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
                  <span className="data-label text-[#7A7A7A] mr-2">{c.clave || "—"}</span>
                  {c.concepto || c.descripcion || "Concepto"}
                  {c.materialIntervencion && (
                    <span className="ml-2 align-middle text-[10px] uppercase tracking-wider bg-[#F5F2EC] border border-[#EDE9E0] text-[#7A7A7A] px-1.5 py-0.5">{c.materialIntervencion}</span>
                  )}
                </h3>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="data-label text-[#C9A84C] font-bold">{money(c.pu)} / {c.unidad || "u"}</span>
                  <button onClick={() => setEditing(c)} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><Pencil size={15} /></button>
                  <button onClick={() => borrar(c.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-[#7A7A7A] data-label">
                <span>Material {money(c.porTipo.material)}</span>
                <span>Herr. {money(c.porTipo.herramienta)}</span>
                <span>Equipo {money(c.porTipo.equipo)}</span>
                <span>M.O. {money(c.porTipo.mano_obra)}</span>
                <span>Recetas {money(c.porTipo.receta)}</span>
                <span className="text-[#1B2A5E]">CD {money(c.costoDirecto)}</span>
                <span className="text-[#7A7A7A]">{c.insumos.length} insumos</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConceptoEditor({
  concept,
  materiales,
  recetas,
  salarios,
  catalogs,
  existingClaves,
  onCancel,
  onSaved,
}: {
  concept: Concept | null;
  materiales: CostMaterial[];
  recetas: Recipe[];
  salarios: LaborRate[];
  catalogs: ReturnType<typeof buildCatalogs>;
  existingClaves: string[];
  onCancel: () => void;
  onSaved: (c: Concept) => void;
}) {
  const [form, setForm] = useState({
    clave: concept?.clave ?? "",
    concepto: concept?.concepto ?? "",
    descripcion: concept?.descripcion ?? "",
    unidad: concept?.unidad ?? "PZA",
    materialIntervencion: concept?.materialIntervencion ?? "",
    factorIndirectos: String(concept?.factorIndirectos ?? 0.25),
    factorUtilidad: String(concept?.factorUtilidad ?? 0.3),
    tiempoPU: concept?.tiempoPU != null ? String(concept.tiempoPU) : "",
  });
  // Generador de clave FASE[-BIEN]-###.
  const [claveFase, setClaveFase] = useState("REST");
  const [claveBien, setClaveBien] = useState("ESC");
  const faseDef = FASES.find((f) => f.code === claveFase);
  const generarClave = () => {
    const prefix = faseDef?.bien ? `${claveFase}-${claveBien}` : claveFase;
    setForm((f) => ({ ...f, clave: nextClave(prefix, existingClaves) }));
  };

  const [insumos, setInsumos] = useState<ConceptInput[]>(ordenarInsumos(concept?.insumos ?? []));
  const [kind, setKind] = useState<CostInputKind>("material");
  const [refId, setRefId] = useState("");
  const [cant, setCant] = useState("1");
  const [depr, setDepr] = useState("100"); // % de depreciación para equipo/herramienta/material
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Búsqueda y filtro por categoría dentro del picker de insumos (la lista
  // completa es muy larga; permite hallar rápido un material, p. ej. solventes).
  const [pq, setPq] = useState("");
  const [pcat, setPcat] = useState("");

  // Cuadrilla = los renglones de mano de obra agrupados por rol (rol × jornadas).
  // JOR TOTALES = suma de jornadas (como E74 en el Excel); alimenta el cronograma.
  const cuadrilla = useMemo(() => {
    const porRol = new Map<string, number>();
    for (const i of insumos) {
      if (i.kind !== "mano_obra") continue;
      porRol.set(i.nombre, (porRol.get(i.nombre) ?? 0) + i.cantidad);
    }
    return [...porRol].map(([rol, jornadas]) => ({ rol, jornadas }));
  }, [insumos]);
  const jorTotales = useMemo(
    () => insumos.filter((i) => i.kind === "mano_obra").reduce((a, i) => a + i.cantidad, 0),
    [insumos],
  );

  // Categorías disponibles para el tipo elegido (solo materiales/herramienta/equipo).
  const kindCats = useMemo(() => {
    if (kind === "receta" || kind === "mano_obra") return [];
    return [...new Set(materiales.filter((m) => m.kind === kind).map((m) => m.categoria).filter(Boolean))].sort();
  }, [kind, materiales]);

  // Opciones del picker según el tipo elegido, filtradas por búsqueda y categoría.
  const opciones = useMemo(() => {
    let base: { id: string; label: string; cat?: string }[];
    if (kind === "receta")
      base = recetas.map((r) => ({ id: r.id, label: `${r.nombre} · ${money(r.costo)}` }));
    else if (kind === "mano_obra")
      base = salarios.map((s) => ({ id: s.id, label: `${s.rol} · ${money(s.jornada)}/jornada` }));
    else
      base = materiales
        .filter((m) => m.kind === kind)
        .map((m) => ({ id: m.id, label: `${m.nombre}${m.categoria ? " · " + m.categoria : ""} · ${money(m.precio)}`, cat: m.categoria }));
    const nq = pq.trim().toLowerCase();
    return base.filter((o) => (!pcat || o.cat === pcat) && (!nq || o.label.toLowerCase().includes(nq)));
  }, [kind, materiales, recetas, salarios, pq, pcat]);

  // Cálculo en vivo con el mismo motor del servidor.
  const preview = useMemo(() => {
    const c: Concept = {
      id: concept?.id ?? "nuevo",
      clave: form.clave,
      concepto: form.concepto,
      descripcion: form.descripcion,
      unidad: form.unidad,
      insumos,
      factorIndirectos: Number(form.factorIndirectos) || 0,
      factorUtilidad: Number(form.factorUtilidad) || 0,
      tiempoPU: form.tiempoPU === "" ? null : Number(form.tiempoPU),
      costoDirecto: 0,
      pu: 0,
      global: true,
      createdAt: concept?.createdAt ?? 0,
    };
    return conceptBreakdown(c, catalogs);
  }, [form, insumos, catalogs, concept]);

  function addInsumo() {
    if (!refId) return;
    const cantidad = Number(cant) || 0;
    let nombre = "", unidad = "", precio = 0;
    if (kind === "receta") {
      const r = recetas.find((x) => x.id === refId);
      if (r) { nombre = r.nombre; unidad = r.unidad; precio = r.costo; }
    } else if (kind === "mano_obra") {
      const s = salarios.find((x) => x.id === refId);
      if (s) { nombre = s.rol; unidad = "jornada"; precio = s.jornada; }
    } else {
      const m = materiales.find((x) => x.id === refId);
      if (m) { nombre = m.nombre; unidad = m.unidad; precio = m.precio; }
    }
    // La depreciación solo aplica a equipo/herramienta/material (fracción 0..1).
    const esDepreciable = kind === "material" || kind === "herramienta" || kind === "equipo";
    const depreciacion = esDepreciable ? Math.min(1, Math.max(0, (Number(depr) || 0) / 100)) : undefined;
    setInsumos((xs) => ordenarInsumos([...xs, { kind, refId, nombre, unidad, precio, cantidad, depreciacion }]));
    setRefId("");
    setCant("1");
    setDepr("100");
  }

  async function guardar() {
    if (!form.concepto.trim() && !form.descripcion.trim()) {
      setError("Ponle un nombre o descripción al concepto.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = {
      clave: form.clave,
      concepto: form.concepto,
      descripcion: form.descripcion,
      unidad: form.unidad,
      materialIntervencion: form.materialIntervencion,
      factorIndirectos: Number(form.factorIndirectos) || 0,
      factorUtilidad: Number(form.factorUtilidad) || 0,
      // Si no capturan "jornadas/unidad", se usa JOR TOTALES de la cuadrilla.
      tiempoPU: form.tiempoPU === "" ? (jorTotales > 0 ? jorTotales : null) : Number(form.tiempoPU),
      insumos,
      global: true,
    };
    const res = await fetch(
      concept ? `/api/costos/conceptos/${concept.id}` : "/api/costos/conceptos",
      {
        method: concept ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      onSaved(data.concepto);
    } else {
      setError("No se pudo guardar.");
    }
  }

  return (
    <div className="bg-white border border-[#EDE9E0] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
          {concept ? "Editar concepto" : "Nuevo concepto"}
        </h3>
        <button onClick={onCancel} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={18} /></button>
      </div>

      {/* Generador de clave automática */}
      <div className="bg-[#F5F2EC] border border-[#EDE9E0] p-3 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#7A7A7A] uppercase tracking-wider">Clave automática</span>
        <select value={claveFase} onChange={(e) => setClaveFase(e.target.value)} className={INPUT + " w-auto"} title="Fase / proceso">
          {FASES.map((f) => <option key={f.code} value={f.code}>{f.code} · {f.label}</option>)}
        </select>
        {faseDef?.bien && (
          <select value={claveBien} onChange={(e) => setClaveBien(e.target.value)} className={INPUT + " w-auto"} title="Tipo de bien">
            {TIPOS_BIEN.map((t) => <option key={t.code} value={t.code}>{t.code} · {t.label}</option>)}
          </select>
        )}
        <span className="data-label text-xs text-[#7A7A7A]">→ {faseDef?.bien ? `${claveFase}-${claveBien}` : claveFase}-###</span>
        <button type="button" onClick={generarClave} className="ml-auto flex items-center gap-2 border border-[#1B2A5E] text-[#1B2A5E] px-3 py-2 text-xs tracking-wider uppercase font-semibold hover:bg-[#1B2A5E] hover:text-[#F5F2EC]">Generar clave</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <input className={INPUT} placeholder="Clave" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} />
        <input className={INPUT + " sm:col-span-2 lg:col-span-2"} placeholder="Concepto" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
        <input className={INPUT} placeholder="Unidad (PZA, M2…)" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
        <textarea className={INPUT + " sm:col-span-2 lg:col-span-4 resize-y"} rows={2} placeholder="Descripción (aparece completa en el PDF)" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        <div className="sm:col-span-2 lg:col-span-2">
          <input className={INPUT} placeholder="Material a intervenir (metal, madera, piedra…)" list="mat-interv-list" value={form.materialIntervencion} onChange={(e) => setForm({ ...form, materialIntervencion: e.target.value })} />
          <datalist id="mat-interv-list">
            {["Metal", "Madera", "Piedra", "Textil", "Papel", "Pintura de caballete", "Pintura mural", "Cerámica", "Vidrio", "Yeso"].map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>
        <label className="text-xs text-[#7A7A7A]">Indirectos<input className={INPUT} type="number" step="0.01" value={form.factorIndirectos} onChange={(e) => setForm({ ...form, factorIndirectos: e.target.value })} /></label>
        <label className="text-xs text-[#7A7A7A]">Utilidad<input className={INPUT} type="number" step="0.01" value={form.factorUtilidad} onChange={(e) => setForm({ ...form, factorUtilidad: e.target.value })} /></label>
        <label className="text-xs text-[#7A7A7A]">Jornadas / unidad (cronograma)<input className={INPUT} type="number" step="0.0001" placeholder={jorTotales > 0 ? `auto: ${jorTotales.toFixed(4)}` : "cronograma"} value={form.tiempoPU} onChange={(e) => setForm({ ...form, tiempoPU: e.target.value })} /></label>
      </div>

      {/* Matriz de insumos */}
      <div className="border border-[#EDE9E0] overflow-x-auto mb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0] bg-[#F5F2EC]/60">
              <th className="px-3 py-2 font-semibold">Tipo</th>
              <th className="px-3 py-2 font-semibold">Insumo</th>
              <th className="px-3 py-2 font-semibold text-right">P.U.</th>
              <th className="px-3 py-2 font-semibold text-right">Cantidad</th>
              <th className="px-3 py-2 font-semibold text-right">Depr. %</th>
              <th className="px-3 py-2 font-semibold text-right">Importe</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {insumos.map((i, idx) => {
              const esDepr = i.kind === "material" || i.kind === "herramienta" || i.kind === "equipo";
              const factor = i.depreciacion == null ? 1 : i.depreciacion;
              return (
              <tr key={idx} className="border-b border-[#F5F2EC]">
                <td className="px-3 py-2 text-[#7A7A7A]">{KIND_OPTS.find((k) => k.value === i.kind)?.label}</td>
                <td className="px-3 py-2 text-[#2C2C2C]">{i.nombre}</td>
                <td className="px-3 py-2 text-right text-[#7A7A7A] data-label">{money(i.precio)}</td>
                <td className="px-3 py-2 text-right data-label">
                  <input
                    type="number" step="0.0001" defaultValue={i.cantidad}
                    onBlur={(e) => { const v = Number(e.target.value) || 0; setInsumos((xs) => xs.map((x, j) => (j === idx ? { ...x, cantidad: v } : x))); }}
                    className="w-20 border border-[#EDE9E0] px-2 py-1 text-right focus:outline-none focus:border-[#C9A84C]"
                  />
                </td>
                <td className="px-3 py-2 text-right data-label">
                  {esDepr ? (
                    <input
                      type="number" step="1" min="0" max="100" defaultValue={Math.round(factor * 100)}
                      onBlur={(e) => { const v = Math.min(1, Math.max(0, (Number(e.target.value) || 0) / 100)); setInsumos((xs) => xs.map((x, j) => (j === idx ? { ...x, depreciacion: v } : x))); }}
                      className="w-16 border border-[#EDE9E0] px-2 py-1 text-right focus:outline-none focus:border-[#C9A84C]"
                    />
                  ) : (
                    <span className="text-[#C0BDB8]">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-[#2C2C2C] data-label">{money(i.precio * i.cantidad * factor)}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => setInsumos((xs) => xs.filter((_, j) => j !== idx))} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
              );
            })}
            {insumos.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-[#7A7A7A] text-sm">Agrega insumos abajo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Agregar insumo */}
      <div className="flex flex-wrap items-end gap-2 mb-5">
        <select value={kind} onChange={(e) => { setKind(e.target.value as CostInputKind); setRefId(""); setPq(""); setPcat(""); }} className={INPUT + " w-40"}>
          {KIND_OPTS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
          <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Buscar insumo…" className={INPUT + " pl-9 w-full"} />
        </div>
        {kindCats.length > 0 && (
          <select value={pcat} onChange={(e) => setPcat(e.target.value)} className={INPUT + " w-40"}>
            <option value="">Todas las categorías</option>
            {kindCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={refId} onChange={(e) => setRefId(e.target.value)} className={INPUT + " flex-1 min-w-[200px]"}>
          <option value="">{opciones.length ? `Elegir del catálogo… (${opciones.length})` : "Sin resultados"}</option>
          {opciones.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <input type="number" step="0.0001" value={cant} onChange={(e) => setCant(e.target.value)} placeholder="Cant." className={INPUT + " w-24"} />
        {(kind === "material" || kind === "herramienta" || kind === "equipo") && (
          <label className="text-xs text-[#7A7A7A] flex flex-col">Depr. %
            <input type="number" step="1" min="0" max="100" value={depr} onChange={(e) => setDepr(e.target.value)} title="% del costo que se carga al concepto (depreciación)" className={INPUT + " w-24"} />
          </label>
        )}
        <button onClick={addInsumo} disabled={!refId} className={BTN_PRIMARY}><Plus size={14} /> Agregar</button>
      </div>

      {/* Equivalencia de tiempo para mano de obra (1 jornada = 8 h) */}
      {kind === "mano_obra" && (
        <div className="flex flex-wrap items-center gap-2 -mt-3 mb-5">
          <span className="text-xs text-[#7A7A7A] uppercase tracking-wider">Equivalencia (1 jor = 8 h)</span>
          {JORNADA_EQUIV.map((e) => (
            <button key={e.label} type="button" onClick={() => setCant(String(e.jor))}
              className="bg-[#F5F2EC] border border-[#EDE9E0] px-2.5 py-1 text-xs hover:border-[#C9A84C]">
              {e.label} <span className="data-label text-[#1B2A5E]">= {e.jor}</span>
            </button>
          ))}
        </div>
      )}

      {/* Cuadrilla: resumen de la mano de obra y jornadas totales */}
      {cuadrilla.length > 0 && (
        <div className="bg-white border border-[#EDE9E0] p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold">Cuadrilla</span>
            <span className="text-xs text-[#7A7A7A]">JOR TOTALES: <span className="data-label text-[#1B2A5E] font-semibold">{jorTotales.toFixed(4)}</span> jornadas / unidad</span>
          </div>
          <div className="space-y-1">
            {cuadrilla.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[#2C2C2C]">{c.rol}</span>
                <span className="data-label text-[#7A7A7A]">{c.jornadas} jor · {(c.jornadas * 8).toFixed(1)} h</span>
              </div>
            ))}
          </div>
          {form.tiempoPU !== String(jorTotales) && (
            <button type="button" onClick={() => setForm((f) => ({ ...f, tiempoPU: String(jorTotales) }))}
              className="mt-3 text-xs text-[#1B2A5E] underline hover:text-[#C9A84C]">
              Usar {jorTotales.toFixed(4)} jornadas en el cronograma →
            </button>
          )}
        </div>
      )}

      {/* Totales en vivo */}
      <div className="bg-[#1B2A5E] text-[#F5F2EC] p-4 flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs data-label text-[#F5F2EC]/70">
          <span>Material {money(preview.porTipo.material)}</span>
          <span>Herr. {money(preview.porTipo.herramienta)}</span>
          <span>Equipo {money(preview.porTipo.equipo)}</span>
          <span>M.O. {money(preview.porTipo.mano_obra)}</span>
          <span>Recetas {money(preview.porTipo.receta)}</span>
        </div>
        <div className="flex items-center gap-5 data-label">
          <span className="text-xs text-[#F5F2EC]/70">CD {money(preview.costoDirecto)} · +Ind {money(preview.indirectos)} · +Util {money(preview.utilidad)}</span>
          <span className="text-[#C9A84C] font-bold text-lg">P.U. {money(preview.pu)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="flex gap-2">
        <button onClick={guardar} disabled={busy} className={BTN_PRIMARY}><Save size={14} /> {concept ? "Guardar cambios" : "Crear concepto"}</button>
        <button onClick={onCancel} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
      </div>
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
