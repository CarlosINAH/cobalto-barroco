export default function About() {
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

  return (
    <section id="nosotros" className="bg-[#F5F2EC] py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-3 font-medium">
            Quiénes somos
          </p>
          <h2
            className="text-[#1B2A5E] text-4xl md:text-5xl mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Nuestra Historia
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-[#C9A84C]" />
            <div className="w-1.5 h-1.5 bg-[#C9A84C] rotate-45" />
            <div className="h-px w-12 bg-[#C9A84C]" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <p className="text-[#2C2C2C]/80 text-lg leading-relaxed mb-6">
              Cobalto Barroco nació de la convicción de que el patrimonio
              artístico y arquitectónico merece ser preservado con el mismo
              cuidado con que fue creado. Somos un equipo de especialistas
              comprometidos con la excelencia en cada intervención.
            </p>
            <p className="text-[#2C2C2C]/70 leading-relaxed">
              Trabajamos en edificios históricos, obras de arte, retablos,
              fachadas y espacios que forman parte de la memoria colectiva.
              Cada proyecto es único y lo tratamos como tal.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            {[
              { num: "15+", label: "Años de experiencia" },
              { num: "200+", label: "Proyectos completados" },
              { num: "50+", label: "Especialistas en equipo" },
              { num: "100%", label: "Compromiso patrimonial" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white border border-[#EDE9E0] p-6 text-center"
              >
                <div
                  className="text-[#C9A84C] text-4xl mb-2"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {s.num}
                </div>
                <div className="text-[#7A7A7A] text-xs tracking-wider uppercase">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="grid md:grid-cols-3 gap-8">
          {values.map((v) => (
            <div key={v.title} className="group">
              <div className="w-8 h-px bg-[#C9A84C] mb-4 group-hover:w-16 transition-all duration-300" />
              <h3
                className="text-[#1B2A5E] text-xl mb-3"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {v.title}
              </h3>
              <p className="text-[#7A7A7A] text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
