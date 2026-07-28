"use client";

import { useCallback, useEffect, useState } from "react";
import { LogIn, LogOut, Loader2, Clock } from "lucide-react";

interface Rec {
  id: string;
  fecha: string;
  hora: string;
  tipo: "entrada" | "salida";
}

export default function Asistencia() {
  const [registros, setRegistros] = useState<Rec[]>([]);
  const [ultimo, setUltimo] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance");
      const data = await res.json();
      if (res.ok) {
        setRegistros(data.registros);
        setUltimo(data.ultimo);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const registrar = async (tipo: "entrada" | "salida") => {
    setSaving(true);
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const dentro = ultimo?.tipo === "entrada";

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="bg-white border border-[#EDE9E0] p-6 flex flex-col items-center text-center">
        <Clock size={28} className="text-[#C9A84C] mb-3" />
        <p className="text-[#7A7A7A] text-sm mb-1">Estado actual</p>
        <p className={`text-lg font-semibold mb-4 ${dentro ? "text-emerald-600" : "text-[#7A7A7A]"}`}>
          {dentro ? "Dentro" : "Fuera"}
        </p>
        <button
          onClick={() => registrar(dentro ? "salida" : "entrada")}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-xs tracking-widest uppercase font-bold text-[#F5F2EC] disabled:opacity-60 ${
            dentro ? "bg-[#7A7A7A] hover:bg-[#5f5f5f]" : "bg-[#1B2A5E] hover:bg-[#243470]"
          }`}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : dentro ? (
            <LogOut size={14} />
          ) : (
            <LogIn size={14} />
          )}
          {dentro ? "Registrar salida" : "Registrar entrada"}
        </button>
        {ultimo && (
          <p className="text-[#7A7A7A] text-xs mt-3">
            Último: {ultimo.tipo} · {ultimo.fecha} {ultimo.hora}
          </p>
        )}
      </div>

      <div className="md:col-span-2 bg-white border border-[#EDE9E0]">
        <div className="px-5 py-3 border-b border-[#EDE9E0] text-[#7A7A7A] text-xs tracking-widest uppercase">
          Historial reciente
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[#7A7A7A] text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-12 text-[#7A7A7A] text-sm">Sin registros todavía.</div>
        ) : (
          registros.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 border-b border-[#EDE9E0] last:border-0">
              <span className="flex items-center gap-2 text-sm">
                {r.tipo === "entrada" ? (
                  <LogIn size={14} className="text-emerald-600" />
                ) : (
                  <LogOut size={14} className="text-[#7A7A7A]" />
                )}
                <span className="text-[#2C2C2C] capitalize">{r.tipo}</span>
              </span>
              <span className="text-[#7A7A7A] text-sm">
                {r.fecha} · {r.hora}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
