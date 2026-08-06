import { Paintbrush, Building2, Layers, FileSearch, Shield, Users } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

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
    <section id="servicios" className="bg-cream-dark py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionHeading index="02" eyebrow="Lo que hacemos" title="Nuestros Servicios" />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={(i % 3) * 90}>
                <div className="relative bg-white p-8 h-full group hover:shadow-lg transition-shadow duration-300 border border-transparent hover:border-gold/30">
                  <span className="data-label absolute top-6 right-6 text-xs text-muted/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="w-12 h-12 bg-navy/5 flex items-center justify-center mb-5 group-hover:bg-navy transition-colors duration-300">
                    <Icon
                      size={22}
                      className="text-navy group-hover:text-gold transition-colors duration-300"
                    />
                  </div>
                  <h3
                    className="text-navy text-xl mb-3"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
