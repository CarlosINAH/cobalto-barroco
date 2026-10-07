"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Trash2,
  Clock,
  MapPin,
  Bell,
  Check,
  Users,
} from "lucide-react";

interface Evt {
  id: string;
  titulo: string;
  descripcion: string;
  lugar: string;
  inicio: number;
  fin: number;
  allDay: boolean;
  color: string;
  integrantes: string[];
  recordatorioMin: number | null;
  recordatorioEnviado: boolean;
  creadoPor: string;
  creadoEn: number;
}

interface Emp {
  username: string;
  nombre: string;
}

const COLORS = [
  { hex: "#1B2A5E", name: "Azul" },
  { hex: "#C9A84C", name: "Dorado" },
  { hex: "#2E7D5B", name: "Verde" },
  { hex: "#B23B3B", name: "Rojo" },
  { hex: "#6B4E9E", name: "Morado" },
  { hex: "#7A7A7A", name: "Gris" },
];

const RECORDATORIOS: { value: number | null; label: string }[] = [
  { value: null, label: "Sin recordatorio" },
  { value: 10, label: "10 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 día antes" },
];

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ---- Utilidades de fecha (hora local del navegador) ----
const pad = (n: number) => String(n).padStart(2, "0");
const dateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const combine = (date: string, time: string) =>
  new Date(`${date}T${time || "00:00"}`).getTime();
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

function hora(ms: number): string {
  return new Date(ms).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CalendarManager() {
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [editing, setEditing] = useState<Evt | null>(null);
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [employees, setEmployees] = useState<Emp[]>([]);

  useEffect(() => {
    fetch("/api/directory")
      .then((r) => (r.ok ? r.json() : { employees: [] }))
      .then((d) => setEmployees(d.employees || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar el calendario.");
        return;
      }
      setEvents(data.events);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Rejilla de 6 semanas que empieza en lunes.
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const eventsOfDay = useCallback(
    (d: Date) => {
      const s = startOfDay(d);
      const e = endOfDay(d);
      return events
        .filter((ev) => ev.inicio <= e && ev.fin >= s)
        .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.inicio - b.inicio);
    },
    [events],
  );

  const today = new Date();
  const openNew = (d: Date) => {
    setDraftDate(d);
    setEditing(null);
  };
  const closeModal = () => {
    setEditing(null);
    setDraftDate(null);
  };

  return (
    <div>
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
            }
            className="flex items-center justify-center border border-[#EDE9E0] text-[#1B2A5E] hover:bg-[#F5F2EC] p-2"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() =>
              setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
            }
            className="flex items-center justify-center border border-[#EDE9E0] text-[#1B2A5E] hover:bg-[#F5F2EC] p-2"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => {
              const n = new Date();
              setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
            }}
            className="border border-[#EDE9E0] text-[#1B2A5E] px-3 py-2 text-xs tracking-widest uppercase font-semibold hover:bg-[#F5F2EC]"
          >
            Hoy
          </button>
          <h2
            className="text-[#1B2A5E] text-lg ml-1"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </h2>
        </div>
        <button
          onClick={() => openNew(new Date())}
          className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470]"
        >
          <Plus size={14} /> Nuevo evento
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 px-4 py-2.5 text-red-600 text-xs mb-4">
          {error}
        </div>
      )}

      {/* Rejilla del mes */}
      <div className="bg-white border border-[#EDE9E0] overflow-hidden">
        {/* Cabecera de días */}
        <div className="grid grid-cols-7 border-b border-[#EDE9E0]">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-center text-[#7A7A7A] text-xs tracking-widest uppercase"
            >
              {w}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-[#7A7A7A] text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const dayEvents = eventsOfDay(d);
              return (
                <button
                  key={i}
                  onClick={() => openNew(d)}
                  className={`text-left min-h-[96px] border-b border-r border-[#EDE9E0] p-1.5 align-top hover:bg-[#F5F2EC]/60 transition-colors ${
                    i % 7 === 6 ? "border-r-0" : ""
                  } ${inMonth ? "bg-white" : "bg-[#FAF8F4]"}`}
                >
                  <div className="flex justify-end">
                    <span
                      className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-[#1B2A5E] text-[#C9A84C] font-bold"
                          : inMonth
                            ? "text-[#2C2C2C]"
                            : "text-[#C0BDB8]"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(ev);
                          setDraftDate(null);
                        }}
                        className="flex items-center gap-1 truncate text-[11px] leading-tight px-1.5 py-1 text-white cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: ev.color }}
                        title={
                          ev.integrantes.length > 0
                            ? `${ev.titulo} · ${ev.integrantes.length} integrante(s)`
                            : ev.titulo
                        }
                      >
                        <span className="truncate flex-1">
                          {!ev.allDay && (
                            <span className="opacity-80">{hora(ev.inicio)} </span>
                          )}
                          {ev.titulo}
                        </span>
                        {ev.integrantes.length > 0 && (
                          <span className="flex items-center gap-0.5 opacity-90 shrink-0">
                            <Users size={10} />
                            {ev.integrantes.length}
                          </span>
                        )}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="block text-[10px] text-[#7A7A7A] px-1">
                        +{dayEvents.length - 3} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[#7A7A7A] text-xs mt-3">
        Toca un día para crear un evento, o un evento para editarlo. Es el
        calendario compartido de la empresa: todos lo ven y pueden editarlo.
      </p>

      {(editing || draftDate) && (
        <EventModal
          event={editing}
          date={draftDate}
          employees={employees}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            load();
          }}
        />
      )}
    </div>
  );
}

function EventModal({
  event,
  date,
  employees,
  onClose,
  onSaved,
}: {
  event: Evt | null;
  date: Date | null;
  employees: Emp[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const base = event
    ? new Date(event.inicio)
    : date ?? new Date();
  const baseEnd = event ? new Date(event.fin) : base;

  const [titulo, setTitulo] = useState(event?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(event?.descripcion ?? "");
  const [lugar, setLugar] = useState(event?.lugar ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [fechaIni, setFechaIni] = useState(dateInput(base));
  const [horaIni, setHoraIni] = useState(
    timeInput(event ? new Date(event.inicio) : roundedNow(base)),
  );
  const [fechaFin, setFechaFin] = useState(dateInput(baseEnd));
  const [horaFin, setHoraFin] = useState(
    timeInput(event ? new Date(event.fin) : roundedNow(base, 60)),
  );
  const [color, setColor] = useState(event?.color ?? COLORS[0].hex);
  const [integrantes, setIntegrantes] = useState<string[]>(
    event?.integrantes ?? [],
  );
  const [recordatorio, setRecordatorio] = useState<number | null>(
    event?.recordatorioMin ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Esc cierra el modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleIntegrante = (username: string) =>
    setIntegrantes((list) =>
      list.some((u) => u.toLowerCase() === username.toLowerCase())
        ? list.filter((u) => u.toLowerCase() !== username.toLowerCase())
        : [...list, username],
    );

  const save = async () => {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    const inicio = allDay
      ? combine(fechaIni, "00:00")
      : combine(fechaIni, horaIni);
    const fin = allDay
      ? new Date(`${fechaFin}T23:59`).getTime()
      : combine(fechaFin, horaFin);
    if (!Number.isFinite(inicio)) {
      setError("Fecha de inicio inválida.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      titulo: titulo.trim(),
      descripcion,
      lugar,
      allDay,
      inicio,
      fin: Number.isFinite(fin) && fin >= inicio ? fin : inicio,
      color,
      integrantes,
      recordatorioMin: recordatorio,
    };
    try {
      const res = await fetch(
        event ? `/api/events/${event.id}` : "/api/events",
        {
          method: event ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
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

  const remove = async () => {
    if (!event) return;
    if (!window.confirm(`¿Eliminar el evento "${event.titulo}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo eliminar.");
        return;
      }
      onSaved();
    } catch {
      setError("Error de conexión.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <h3
            className="text-[#1B2A5E] text-lg"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {event ? "Editar evento" : "Nuevo evento"}
          </h3>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5">
              Título
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
              placeholder="Junta, entrega, visita de obra…"
              className="w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-[#2C2C2C] cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="accent-[#C9A84C]"
            />
            Todo el día
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5">
                Inicio
              </label>
              <input
                type="date"
                value={fechaIni}
                onChange={(e) => setFechaIni(e.target.value)}
                className="w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
              />
              {!allDay && (
                <input
                  type="time"
                  value={horaIni}
                  onChange={(e) => setHoraIni(e.target.value)}
                  className="w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C] mt-2"
                />
              )}
            </div>
            <div>
              <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5">
                Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
              />
              {!allDay && (
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C] mt-2"
                />
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5">
              <MapPin size={12} /> Lugar
            </label>
            <input
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Opcional"
              className="w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Opcional"
              className="w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C] resize-none"
            />
          </div>

          <div>
            <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-2">
              Color
            </label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  aria-label={c.name}
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    color === c.hex ? "ring-2 ring-offset-2 ring-[#1B2A5E]" : ""
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.hex && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5">
              <Users size={12} /> Integrantes
              {integrantes.length > 0 && (
                <span className="text-[#C9A84C] normal-case tracking-normal">
                  · {integrantes.length} seleccionado(s)
                </span>
              )}
            </label>
            {employees.length === 0 ? (
              <p className="text-[#7A7A7A] text-xs border border-[#EDE9E0] bg-white p-3">
                No hay empleados registrados.
              </p>
            ) : (
              <div className="border border-[#EDE9E0] bg-white max-h-44 overflow-y-auto">
                {employees.map((emp) => {
                  const checked = integrantes.some(
                    (u) => u.toLowerCase() === emp.username.toLowerCase(),
                  );
                  return (
                    <label
                      key={emp.username}
                      className="flex items-center gap-2.5 px-3 py-2 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIntegrante(emp.username)}
                        className="accent-[#C9A84C]"
                      />
                      <span className="text-[#2C2C2C]">{emp.nombre}</span>
                      <span className="text-[#7A7A7A] text-xs">@{emp.username}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-[#7A7A7A] text-[11px] mt-1">
              Si marcas integrantes, el recordatorio por correo se envía solo a
              ellos; si no, a todo el equipo.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5">
              <Bell size={12} /> Recordatorio por correo
            </label>
            <select
              value={recordatorio === null ? "" : String(recordatorio)}
              onChange={(e) =>
                setRecordatorio(e.target.value === "" ? null : Number(e.target.value))
              }
              className="w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
            >
              {RECORDATORIOS.map((r) => (
                <option key={r.label} value={r.value === null ? "" : r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-[#7A7A7A] text-[11px] mt-1">
              Se avisa a todo el equipo por correo (requiere correo configurado).
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-[#EDE9E0]">
          <div>
            {event && (
              <button
                onClick={remove}
                disabled={deleting || saving}
                className="flex items-center gap-2 border border-red-200 text-red-500 px-3 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-red-500 hover:text-white disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Eliminar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs tracking-widest uppercase font-semibold text-[#7A7A7A] hover:text-[#1B2A5E]"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving || deleting}
              className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Clock size={13} />
              )}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hora redondeada al cuarto siguiente, sobre la fecha dada, +offset minutos. */
function roundedNow(onDate: Date, offsetMin = 0): Date {
  const now = new Date();
  const d = new Date(onDate);
  d.setHours(now.getHours(), now.getMinutes(), 0, 0);
  const q = Math.ceil(d.getMinutes() / 15) * 15;
  d.setMinutes(q);
  if (offsetMin) d.setMinutes(d.getMinutes() + offsetMin);
  return d;
}
