"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Servicios", href: "#servicios" },
  { label: "Proyectos", href: "#proyectos" },
  { label: "Contacto", href: "#contacto" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#1B2A5E] shadow-lg"
          : "bg-[#1B2A5E]/90 backdrop-blur-sm"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Cobalto Barroco"
            width={48}
            height={48}
            className="rounded-sm object-contain bg-[#F5F2EC] p-1"
          />
          <span
            className="text-[#F5F2EC] font-bold tracking-widest text-sm uppercase hidden sm:block"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Cobalto Barroco
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[#F5F2EC]/80 hover:text-[#C9A84C] text-sm tracking-wider uppercase transition-colors duration-200"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          href="/login"
          className="hidden md:inline-flex items-center gap-2 border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#1B2A5E] px-5 py-2 text-xs tracking-widest uppercase transition-all duration-200 font-semibold"
        >
          Ingresar
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-[#F5F2EC]"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#1B2A5E] border-t border-[#C9A84C]/30 px-6 pb-6">
          <ul className="flex flex-col gap-4 pt-4">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block text-[#F5F2EC]/80 hover:text-[#C9A84C] text-sm tracking-wider uppercase transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                className="inline-flex border border-[#C9A84C] text-[#C9A84C] px-5 py-2 text-xs tracking-widest uppercase"
              >
                Ingresar
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
