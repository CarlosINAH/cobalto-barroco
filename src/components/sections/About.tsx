import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const stats = [
  { num: "15+", label: "Años de experiencia" },
  { num: "200+", label: "Proyectos completados" },
  { num: "50+", label: "Especialistas en equipo" },
  { num: "100%", label: "Compromiso patrimonial" },
];

const values = [
  {
    title: "Tradición",
    desc: "Más de una generación aplicando técnicas históricas con materiales auténticos.",
  },
  {
    title: "Precisión",
    desc: "Cada intervención es documentada y ejecutada con los más altos estándares de conservación.",
  },
  {
    title: "Pasión",
    desc: "Amamos lo que hacemos. El arte y la historia son el motor de cada proyecto.",
  },
];

export default function About() {
  return (
    <section id="nosotros" className="bg-cream py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionHeading index="01" eyebrow="Quiénes somos" title="Nuestra Historia" />

        <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
          <Reveal>
            <p className="text-charcoal/80 text-lg leading-relaxed mb-6">
              Cobalto Barroco nació de la convicción de que el patrimonio
              artístico y arquitectónico merece ser preservado con el mismo
              cuidado con que fue creado. Somos un equipo de especialistas
              comprometidos con la excelencia en cada intervención.
            </p>
            <p className="text-charcoal/70 leading-relaxed">
              Trabajamos en edificios históricos, obras de arte, retablos,
              fachadas y espacios que forman parte de la memoria colectiva.
              Cada proyecto es único y lo tratamos como tal.
            </p>
          </Reveal>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className="bg-white border border-cream-dark p-6 text-center h-full transition-colors duration-300 hover:border-gold/40">
                  <div
                    className="data-label text-gold text-4xl mb-2"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {s.num}
                  </div>
                  <div className="text-muted text-xs tracking-wider uppercase">
                    {s.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="grid md:grid-cols-3 gap-8">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 100}>
              <div className="group">
                <span className="data-label text-gold/60 text-xs block mb-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="w-8 h-px bg-gold mb-4 group-hover:w-16 transition-all duration-300" />
                <h3
                  className="text-navy text-xl mb-3"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {v.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{v.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
