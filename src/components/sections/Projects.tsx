import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const projects = [
  {
    ref: "PM-2023",
    category: "Pintura Mural",
    title: "Capilla del Ex-Convento de San Francisco",
    location: "Ciudad de México",
    year: "2023",
    desc: "Restauración integral de pinturas murales del siglo XVII. Consolidación de estratos pictóricos y reintegración cromática.",
  },
  {
    ref: "FH-2023",
    category: "Fachada Histórica",
    title: "Palacio de la Reforma",
    location: "Puebla, México",
    year: "2023",
    desc: "Intervención en fachada neoclásica. Limpieza, reparación de cantería y tratamiento de elementos ornamentales.",
  },
  {
    ref: "RT-2022",
    category: "Retablo",
    title: "Retablo Mayor Parroquia de San Miguel",
    location: "Oaxaca, México",
    year: "2022",
    desc: "Restauración de retablo barroco dorado. Consolidación de dorado original, limpieza y reintegración de faltantes.",
  },
];

export default function Projects() {
  return (
    <section id="proyectos" className="bg-cream py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionHeading index="03" eyebrow="Nuestro trabajo" title="Proyectos Destacados" />

        <div className="space-y-8">
          {projects.map((p, i) => (
            <Reveal key={p.title} delay={i * 90}>
              <article className="group grid md:grid-cols-4 gap-6 bg-white border border-cream-dark p-8 hover:border-gold/40 transition-colors duration-300">
                <div className="md:col-span-1">
                  <span className="text-gold text-xs tracking-widest uppercase font-semibold block mb-2">
                    {p.category}
                  </span>
                  <dl className="data-label text-muted text-xs space-y-1">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted/60">REF</dt>
                      <dd>{p.ref}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted/60">LUGAR</dt>
                      <dd className="text-right">{p.location}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted/60">AÑO</dt>
                      <dd>{p.year}</dd>
                    </div>
                  </dl>
                </div>
                <div className="md:col-span-3 md:border-l md:border-cream-dark md:pl-6">
                  <h3
                    className="text-navy text-2xl mb-3 group-hover:text-navy-light transition-colors"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{p.desc}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
