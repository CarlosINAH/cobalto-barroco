import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#1B2A5E] text-[#F5F2EC]/70">
      {/* Gold top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Brand */}
        <div>
          <h3
            className="text-[#F5F2EC] text-2xl mb-2"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Cobalto Barroco
          </h3>
          <div className="w-12 h-px bg-[#C9A84C] mb-4" />
          <p className="text-sm leading-relaxed">
            Empresa especializada en la restauración artística y arquitectónica.
            Conservamos el patrimonio con excelencia y tradición.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-[#C9A84C] text-xs tracking-widest uppercase mb-4 font-semibold">
            Navegación
          </h4>
          <ul className="space-y-2 text-sm">
            {["Inicio", "Nosotros", "Servicios", "Proyectos", "Contacto"].map(
              (item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase()}`}
                    className="hover:text-[#C9A84C] transition-colors"
                  >
                    {item}
                  </a>
                </li>
              )
            )}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-[#C9A84C] text-xs tracking-widest uppercase mb-4 font-semibold">
            Contacto
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Mail size={14} className="text-[#C9A84C] shrink-0" />
              <span>contacto@cobaltobarroco.com</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={14} className="text-[#C9A84C] shrink-0" />
              <span>+52 (55) 0000-0000</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={14} className="text-[#C9A84C] shrink-0 mt-0.5" />
              <span>Ciudad de México, México</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#F5F2EC]/10 py-6 text-center text-xs text-[#F5F2EC]/40">
        © {new Date().getFullYear()} Cobalto Barroco. Todos los derechos reservados.
      </div>
    </footer>
  );
}
