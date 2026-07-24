"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Inbox, Mail, Loader2, X, RefreshCw } from "lucide-react";

interface Msg {
  id: string;
  fromUsername: string;
  toUsername: string;
  asunto: string;
  cuerpo: string;
  emailEnviado: boolean;
  createdAt: number;
}
interface Contacto {
  username: string;
  nombre: string;
  email: string;
}

function fmt(ms: number) {
  return new Date(ms).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Mensajes({ me }: { me: string }) {
  const [recibidos, setRecibidos] = useState<Msg[]>([]);
  const [enviados, setEnviados] = useState<Msg[]>([]);
  const [directorio, setDirectorio] = useState<Contacto[]>([]);
  const [tab, setTab] = useState<"recibidos" | "enviados">("recibidos");
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      if (res.ok) {
        setRecibidos(data.recibidos);
        setEnviados(data.enviados);
        setDirectorio(data.directorio);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = tab === "recibidos" ? recibidos : enviados;

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          {(["recibidos", "enviados"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase font-semibold transition-colors ${
                tab === t
                  ? "bg-[#1B2A5E] text-[#C9A84C]"
                  : "bg-white border border-[#EDE9E0] text-[#7A7A7A] hover:border-[#1B2A5E]"
              }`}
            >
              {t === "recibidos" ? <Inbox size={13} /> : <Send size={13} />}
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="border border-[#EDE9E0] text-[#7A7A7A] px-3 py-2.5 hover:text-[#1B2A5E]"
            title="Actualizar"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setCompose(true)}
            className="flex items-center gap-2 bg-[#C9A84C] text-[#1B2A5E] px-4 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#D4B86A]"
          >
            <Mail size={13} /> Nuevo mensaje
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#EDE9E0]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#7A7A7A] text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-[#7A7A7A] text-sm">
            {tab === "recibidos"
              ? "No tienes mensajes recibidos."
              : "No has enviado mensajes."}
          </div>
        ) : (
          list.map((m) => (
            <div
              key={m.id}
              className="px-5 py-4 border-b border-[#EDE9E0] last:border-0"
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-[#1B2A5E] text-sm font-semibold">
                  {tab === "recibidos" ? `De: @${m.fromUsername}` : `Para: @${m.toUsername}`}
                </span>
                <span className="text-[#7A7A7A] text-xs">{fmt(m.createdAt)}</span>
              </div>
              {m.asunto && (
                <p className="text-[#2C2C2C] text-sm font-medium">{m.asunto}</p>
              )}
              <p className="text-[#7A7A7A] text-sm whitespace-pre-wrap mt-0.5">
                {m.cuerpo}
              </p>
              {tab === "enviados" && (
                <span
                  className={`inline-block mt-2 text-xs ${m.emailEnviado ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {m.emailEnviado ? "✓ Enviado por correo" : "• Guardado (correo no enviado)"}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {compose && (
        <ComposeModal
          me={me}
          directorio={directorio}
          onClose={() => setCompose(false)}
          onSent={() => {
            setCompose(false);
            setTab("enviados");
            load();
          }}
        />
      )}
    </>
  );
}

function ComposeModal({
  me,
  directorio,
  onClose,
  onSent,
}: {
  me: string;
  directorio: Contacto[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [to, setTo] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const dests = directorio.filter((d) => d.username.toLowerCase() !== me.toLowerCase());

  const send = async () => {
    setSending(true);
    setError("");
    setAviso("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, asunto, cuerpo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar.");
        return;
      }
      if (data.aviso) {
        setAviso(data.aviso);
        setTimeout(onSent, 1800);
      } else {
        onSent();
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setSending(false);
    }
  };

  const field =
    "w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
  const label = "block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
            Nuevo mensaje
          </h3>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={label}>Para</label>
            <select className={field} value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Elige un destinatario…</option>
              {dests.map((d) => (
                <option key={d.username} value={d.username}>
                  {d.nombre} (@{d.username}){d.email ? "" : " — sin correo"}
                </option>
              ))}
            </select>
            {dests.length === 0 && (
              <p className="text-[#7A7A7A] text-xs mt-1">
                No hay destinatarios en el directorio todavía (se agregan en Personal).
              </p>
            )}
          </div>
          <div>
            <label className={label}>Asunto</label>
            <input className={field} value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          </div>
          <div>
            <label className={label}>Mensaje</label>
            <textarea
              className={`${field} min-h-32`}
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs">
              {error}
            </div>
          )}
          {aviso && (
            <div className="bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700 text-xs">
              {aviso}
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
            onClick={send}
            disabled={sending || !to || !cuerpo}
            className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] disabled:opacity-50"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
