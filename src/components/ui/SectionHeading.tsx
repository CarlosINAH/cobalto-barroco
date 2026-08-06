import Reveal from "@/components/ui/Reveal";

/**
 * Encabezado de sección unificado: índice numerado (registro "científico"),
 * antetítulo, título en Playfair y ornamento. `tone` adapta el color a
 * secciones claras u oscuras.
 */
export default function SectionHeading({
  index,
  eyebrow,
  title,
  tone = "light",
}: {
  index: string;
  eyebrow: string;
  title: string;
  tone?: "light" | "dark";
}) {
  const titleColor = tone === "dark" ? "text-cream" : "text-navy";
  const eyebrowColor = "text-gold";

  return (
    <Reveal className="text-center mb-16">
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className={`data-label text-xs ${eyebrowColor}`}>{index}</span>
        <span className="h-px w-6 bg-gold/50" />
        <p className={`${eyebrowColor} text-xs tracking-[0.4em] uppercase font-medium`}>
          {eyebrow}
        </p>
      </div>
      <h2
        className={`${titleColor} text-4xl md:text-5xl mb-4`}
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {title}
      </h2>
      <div className="flex items-center justify-center gap-4">
        <div className="h-px w-12 bg-gold" />
        <div className="w-1.5 h-1.5 bg-gold rotate-45" />
        <div className="h-px w-12 bg-gold" />
      </div>
    </Reveal>
  );
}
