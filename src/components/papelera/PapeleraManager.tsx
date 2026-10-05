"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Trash2,
  RotateCcw,
  Folder,
  File as FileIcon,
  Loader2,
  Flame,
} from "lucide-react";

interface TrashItem {
  id: string;
  nombre: string;
  originalPath: string;
  trashPath: string;
  isDir: boolean;
  deletedBy: string;
  deletedAt: number;
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

export default function PapeleraManager({ role }: { role: "admin" | "empleado" }) {
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/files/trash");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar.");
        setItems([]);
        return;
      }
      setItems(data.items);
    } catch {
      setError("Error de conexión.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (
    action: "restore" | "delete" | "empty",
    id?: string,
  ) => {
    setBusy(id || action);
    setError("");
    try {
      const res = await fetch("/api/files/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo completar la acción.");
        return;
      }
      await load();
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(null);
    }
  };

  const restore = (it: TrashItem) => act("restore", it.id);
  const remove = (it: TrashItem) => {
    if (window.confirm(`¿Eliminar "${it.nombre}" definitivamente? No se podrá recuperar.`))
      act("delete", it.id);
  };
  const empty = () => {
    if (window.confirm("¿Vaciar toda la papelera? Se borrará todo definitivamente."))
      act("empty");
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6">
        <p className="text-[#7A7A7A] text-sm max-w-xl">
          Lo que se elimina llega aquí y se puede <b>restaurar</b>.{" "}
          {role === "admin"
            ? "Como administrador, puedes eliminar definitivamente o vaciar la papelera."
            : "Solo un administrador puede vaciar la papelera (borrado definitivo)."}
        </p>
        {role === "admin" && items && items.length > 0 && (
          <button
            onClick={empty}
            disabled={busy === "empty"}
            className="flex items-center gap-2 border border-red-200 text-red-500 px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 shrink-0"
          >
            {busy === "empty" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Flame size={13} />
            )}
            Vaciar papelera
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 px-4 py-2.5 text-red-600 text-xs mb-4">
          {error}
        </div>
      )}

      {items === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[#7A7A7A] text-sm">
          <Loader2 size={16} className="animate-spin" /> Cargando…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#EDE9E0] py-16 text-center">
          <Trash2 size={32} className="text-[#EDE9E0] mx-auto mb-3" />
          <p className="text-[#7A7A7A] text-sm">La papelera está vacía.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#EDE9E0]">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {it.isDir ? (
                  <Folder size={18} className="text-[#C9A84C] shrink-0" />
                ) : (
                  <FileIcon size={18} className="text-blue-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[#2C2C2C] text-sm truncate">{it.nombre}</p>
                  <p className="text-[#7A7A7A] text-xs truncate">
                    {it.originalPath} · {it.deletedBy} · {fmtDateTime(it.deletedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => restore(it)}
                  disabled={busy === it.id}
                  className="flex items-center gap-1.5 border border-[#EDE9E0] text-[#1B2A5E] px-3 py-1.5 text-xs font-semibold hover:bg-[#1B2A5E] hover:text-[#F5F2EC] transition-colors disabled:opacity-50"
                >
                  {busy === it.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RotateCcw size={12} />
                  )}
                  Restaurar
                </button>
                {role === "admin" && (
                  <button
                    onClick={() => remove(it)}
                    disabled={busy === it.id}
                    className="flex items-center gap-1.5 border border-red-200 text-red-500 px-3 py-1.5 text-xs font-semibold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
