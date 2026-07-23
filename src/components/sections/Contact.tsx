"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function Contact() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section id="contacto" className="bg-[#1B2A5E] py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-3 font-medium">
            Hablemos
          </p>
          <h2
            className="text-[#F5F2EC] text-4xl md:text-5xl mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Contáctanos
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-[#C9A84C]" />
            <div className="w-1.5 h-1.5 bg-[#C9A84C] rotate-45" />
            <div className="h-px w-12 bg-[#C9A84C]" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-16">
          {/* Info */}
          <div>
            <p className="text-[#F5F2EC]/70 leading-relaxed mb-10">
              ¿Tienes un proyecto de restauración? Cuéntanos sobre tu patrimonio
              y con gusto te daremos una consulta inicial sin costo.
            </p>
            <ul className="space-y-6">
              {[
                { icon: Mail, text: "contacto@cobaltobarroco.com" },
                { icon: Phone, text: "+52 (55) 0000-0000" },
                { icon: MapPin, text: "Ciudad de México, México" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-4">
                  <div className="w-10 h-10 border border-[#C9A84C]/40 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-[#C9A84C]" />
                  </div>
                  <span className="text-[#F5F2EC]/70 text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form */}
          {sent ? (
            <div className="flex flex-col items-center justify-center text-center border border-[#C9A84C]/30 p-12">
              <div className="w-12 h-12 bg-[#C9A84C]/10 flex items-center justify-center mb-4">
                <Send size={20} className="text-[#C9A84C]" />
              </div>
              <h3
                className="text-[#F5F2EC] text-2xl mb-2"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Mensaje enviado
              </h3>
              <p className="text-[#F5F2EC]/60 text-sm">
                Nos pondremos en contacto contigo en breve.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {[
                { name: "nombre", label: "Nombre completo", type: "text" },
                { name: "email", label: "Correo electrónico", type: "email" },
                { name: "telefono", label: "Teléfono (opcional)", type: "tel" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-[#F5F2EC]/60 text-xs tracking-widest uppercase mb-2">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    required={f.name !== "telefono"}
                    className="w-full bg-transparent border border-[#F5F2EC]/20 text-[#F5F2EC] px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#F5F2EC]/20"
                  />
                </div>
              ))}

              <div>
                <label className="block text-[#F5F2EC]/60 text-xs tracking-widest uppercase mb-2">
                  Mensaje
                </label>
                <textarea
                  rows={4}
                  required
                  className="w-full bg-transparent border border-[#F5F2EC]/20 text-[#F5F2EC] px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors resize-none placeholder:text-[#F5F2EC]/20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#C9A84C] text-[#1B2A5E] py-3.5 text-sm tracking-widest uppercase font-bold hover:bg-[#D4B86A] transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Send size={14} />
                Enviar mensaje
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
