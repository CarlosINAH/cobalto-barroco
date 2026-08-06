"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, AlertCircle, Loader2 } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const fields = [
  { name: "nombre", label: "Nombre completo", type: "text", required: true },
  { name: "email", label: "Correo electrónico", type: "email", required: true },
  { name: "telefono", label: "Teléfono (opcional)", type: "tel", required: false },
] as const;

const contactInfo = [
  { icon: Mail, text: "contacto@cobaltobarroco.com" },
  { icon: Phone, text: "+52 (55) 0000-0000" },
  { icon: MapPin, text: "Ciudad de México, México" },
];

export default function Contact() {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", mensaje: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [emailDelivered, setEmailDelivered] = useState(true);
  const [error, setError] = useState("");

  const update = (name: string, value: string) =>
    setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar el mensaje.");
        setStatus("idle");
        return;
      }
      setEmailDelivered(Boolean(data.emailEnviado));
      setStatus("sent");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setStatus("idle");
    }
  };

  const loading = status === "loading";

  return (
    <section id="contacto" className="relative bg-navy py-28 px-6 overflow-hidden">
      <div className="absolute inset-0 blueprint-grid opacity-60" />
      <div className="relative max-w-6xl mx-auto">
        <SectionHeading index="04" eyebrow="Hablemos" title="Contáctanos" tone="dark" />

        <div className="grid md:grid-cols-2 gap-16">
          {/* Info */}
          <Reveal>
            <p className="text-cream/70 leading-relaxed mb-10">
              ¿Tienes un proyecto de restauración? Cuéntanos sobre tu patrimonio
              y con gusto te daremos una consulta inicial sin costo.
            </p>
            <ul className="space-y-6">
              {contactInfo.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-4">
                  <div className="w-10 h-10 border border-gold/40 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-gold" />
                  </div>
                  <span className="text-cream/70 text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Form */}
          <Reveal delay={120}>
            {status === "sent" ? (
              <div className="flex flex-col items-center justify-center text-center border border-gold/30 p-12 h-full">
                <div className="w-12 h-12 bg-gold/10 flex items-center justify-center mb-4">
                  <Send size={20} className="text-gold" />
                </div>
                <h3
                  className="text-cream text-2xl mb-2"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Mensaje enviado
                </h3>
                <p className="text-cream/60 text-sm max-w-xs">
                  {emailDelivered
                    ? "Gracias por escribirnos. Nos pondremos en contacto contigo en breve."
                    : "Recibimos tu consulta y quedó registrada. Nos pondremos en contacto contigo pronto."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {fields.map((f) => (
                  <div key={f.name}>
                    <label
                      htmlFor={`contact-${f.name}`}
                      className="block text-cream/60 text-xs tracking-widest uppercase mb-2"
                    >
                      {f.label}
                    </label>
                    <input
                      id={`contact-${f.name}`}
                      name={f.name}
                      type={f.type}
                      required={f.required}
                      value={form[f.name]}
                      onChange={(e) => update(f.name, e.target.value)}
                      className="w-full bg-transparent border border-cream/20 text-cream px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors placeholder:text-cream/20"
                    />
                  </div>
                ))}

                <div>
                  <label
                    htmlFor="contact-mensaje"
                    className="block text-cream/60 text-xs tracking-widest uppercase mb-2"
                  >
                    Mensaje
                  </label>
                  <textarea
                    id="contact-mensaje"
                    name="mensaje"
                    rows={4}
                    required
                    value={form.mensaje}
                    onChange={(e) => update("mensaje", e.target.value)}
                    className="w-full bg-transparent border border-cream/20 text-cream px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors resize-none placeholder:text-cream/20"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 border border-red-300/40 bg-red-500/10 px-3 py-2.5 text-red-200 text-xs"
                  >
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold text-navy py-3.5 text-sm tracking-widest uppercase font-bold hover:bg-gold-light transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {loading ? "Enviando…" : "Enviar mensaje"}
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
