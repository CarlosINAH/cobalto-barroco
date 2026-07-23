import { Paintbrush, Building2, Layers, FileSearch, Shield, Users } from "lucide-react";

const services = [
  {
    icon: Paintbrush,
    title: "Restauración de Pintura",
    desc: "Conservación y restauración de obras pictóricas sobre lienzo, tabla y muro. Limpieza, consolidación y reintegración cromática.",
  },
  {
    icon: Building2,
    title: "Fachadas Históricas",
    desc: "Intervención en fachadas de edificios patrimoniales. Tratamiento de cantería, estuco y elementos decorativos.",
  },
  {
    icon: Layers,
    title: "Retablos y Esculturas",
    desc: "Restauración de retablos, imágenes religiosas y escultura policromada. Tratamiento de madera, estuco y aplicaciones metálicas.",
  },
  {
    icon: FileSearch,
    title: "Diagnóstico y Estudio",
    desc: "Análisis técnico y científico del estado de conservación. Informes detallados y propuesta de intervención.",
  },
  {
    icon: Shield,
    title: "Conservación Preventiva",
    desc: "Planes de mantenimiento y conservación para asegurar la longevidad del patrimonio.",
  },
  {
    icon: Users,
    title: "Consultoría",
    desc: "Asesoría especializada para instituciones, museos y propietarios privados sobre el cuidado de sus bienes.",
  },
];

export default function Services() {
  return (
    <section id="servicios" className="bg-[#EDE9E0] py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-3 font-medium">
            Lo que hacemos
          </p>
          <h2
            className="text-[#1B2A5E] text-4xl md:text-5xl mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Nuestros Servicios
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-[#C9A84C]" />
            <div className="w-1.5 h-1.5 bg-[#C9A84C] rotate-45" />
            <div className="h-px w-12 bg-[#C9A84C]" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="bg-white p-8 group hover:shadow-lg transition-shadow duration-300 border border-transparent hover:border-[#C9A84C]/30"
              >
                <div className="w-12 h-12 bg-[#1B2A5E]/5 flex items-center justify-center mb-5 group-hover:bg-[#1B2A5E] transition-colors duration-300">
                  <Icon
                    size={22}
                    className="text-[#1B2A5E] group-hover:text-[#C9A84C] transition-colors duration-300"
                  />
                </div>
                <h3
                  className="text-[#1B2A5E] text-xl mb-3"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {s.title}
                </h3>
                <p className="text-[#7A7A7A] text-sm leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
