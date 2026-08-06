import Reveal from "@/components/ui/Reveal";

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-navy"
    >
      {/* Blueprint grid — the "technical" register under the barroque surface */}
      <div className="absolute inset-0 blueprint-grid" />

      {/* Subtle diagonal texture overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 40px,
            rgba(201,168,76,0.15) 40px,
            rgba(201,168,76,0.15) 41px
          )`,
        }}
      />

      {/* Radial vignette to focus the center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(20,32,74,0.55) 100%)",
        }}
      />

      {/* Gold corner ornaments */}
      <div className="absolute top-28 left-8 w-16 h-16 border-l-2 border-t-2 border-gold/40" />
      <div className="absolute top-28 right-8 w-16 h-16 border-r-2 border-t-2 border-gold/40" />
      <div className="absolute bottom-16 left-8 w-16 h-16 border-l-2 border-b-2 border-gold/40" />
      <div className="absolute bottom-16 right-8 w-16 h-16 border-r-2 border-b-2 border-gold/40" />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Eyebrow */}
        <Reveal>
          <p className="text-gold text-xs tracking-[0.4em] uppercase mb-6 font-medium">
            Restauración Artística &amp; Arquitectónica
          </p>
        </Reveal>

        {/* Ornament */}
        <Reveal delay={80}>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold" />
            <div className="w-1.5 h-1.5 bg-gold rotate-45" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold" />
          </div>
        </Reveal>

        <Reveal delay={140}>
          <h1
            className="text-cream text-5xl md:text-7xl leading-tight mb-6"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Cobalto
            <br />
            <span className="text-gold italic">Barroco</span>
          </h1>
        </Reveal>

        <Reveal delay={220}>
          <p className="text-cream/70 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            Conservamos el patrimonio artístico con la precisión del oficio
            y la pasión de quienes aman lo que hacen.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#servicios"
              className="bg-gold text-navy px-8 py-3.5 text-sm tracking-widest uppercase font-bold hover:bg-gold-light transition-colors duration-200"
            >
              Nuestros Servicios
            </a>
            <a
              href="#contacto"
              className="border border-cream/40 text-cream px-8 py-3.5 text-sm tracking-widest uppercase hover:border-gold hover:text-gold transition-colors duration-200"
            >
              Contáctanos
            </a>
          </div>
        </Reveal>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-cream/40 text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-gold/60 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
