"use client";

import { useState } from "react";

/**
 * Logo de Cobalto Barroco.
 * Muestra el archivo /logo.png (colócalo en la carpeta `public`). Si por lo que
 * sea no está disponible, cae a un monograma dibujado con CSS, para que la
 * esquina superior nunca quede con una imagen rota.
 */
export default function Logo({ size = 44 }: { size?: number }) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 bg-[#F5F2EC] rounded-sm ring-1 ring-[#C9A84C]/50"
        style={{ width: size, height: size }}
        aria-label="Cobalto Barroco"
        role="img"
      >
        <span
          className="leading-none"
          style={{ fontFamily: "var(--font-playfair)", fontSize: size * 0.44 }}
        >
          <span className="text-[#1B2A5E]">C</span>
          <span className="text-[#C9A84C]">B</span>
        </span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center shrink-0 bg-[#F5F2EC] rounded-sm overflow-hidden ring-1 ring-[#C9A84C]/30"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Cobalto Barroco"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        onError={() => setBroken(true)}
      />
    </span>
  );
}
