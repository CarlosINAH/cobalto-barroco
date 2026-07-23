const projects = [
  {
    category: "Pintura Mural",
    title: "Capilla del Ex-Convento de San Francisco",
    location: "Ciudad de México",
    year: "2023",
    desc: "Restauración integral de pinturas murales del siglo XVII. Consolidación de estratos pictóricos y reintegración cromática.",
  },
  {
    category: "Fachada Histórica",
    title: "Palacio de la Reforma",
    location: "Puebla, México",
    year: "2023",
    desc: "Intervención en fachada neoclásica. Limpieza, reparación de cantería y tratamiento de elementos ornamentales.",
  },
  {
    category: "Retablo",
    title: "Retablo Mayor Parroquia de San Miguel",
    location: "Oaxaca, México",
    year: "2022",
    desc: "Restauración de retablo barroco dorado. Consolidación de dorado original, limpieza y reintegración de faltantes.",
  },
];

export default function Projects() {
  return (
    <section id="proyectos" className="bg-[#F5F2EC] py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-3 font-medium">
            Nuestro trabajo
          </p>
          <h2
            className="text-[#1B2A5E] text-4xl md:text-5xl mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Proyectos Destacados
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-[#C9A84C]" />
            <div className="w-1.5 h-1.5 bg-[#C9A84C] rotate-45" />
            <div className="h-px w-12 bg-[#C9A84C]" />
          </div>
        </div>

        <div className="space-y-8">
          {projects.map((p, i) => (
            <div
              key={p.title}
              className="group grid md:grid-cols-4 gap-6 bg-white border border-[#EDE9E0] p-8 hover:border-[#C9A84C]/40 transition-colors duration-300"
            >
              <div className="md:col-span-1">
                <span className="text-[#C9A84C] text-xs tracking-widest uppercase font-semibold block mb-2">
                  {p.category}
                </span>
                <span className="text-[#7A7A7A] text-xs">{p.location}</span>
                <br />
                <span className="text-[#7A7A7A] text-xs">{p.year}</span>
              </div>
              <div className="md:col-span-3">
                <h3
                  className="text-[#1B2A5E] text-2xl mb-3 group-hover:text-[#243470] transition-colors"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {p.title}
                </h3>
                <p className="text-[#7A7A7A] text-sm leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
