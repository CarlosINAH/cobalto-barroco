"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleOn, setGoogleOn] = useState(false);

  // ¿Está habilitado "Entrar con Google"? Se consulta al servidor (runtime),
  // no por variable de build. setState solo tras el await.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/google/status");
        const data = res.ok ? await res.json() : null;
        if (vivo && data?.enabled) setGoogleOn(true);
      } catch { /* sin Google */ }
    })();
    return () => { vivo = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesión.");
        return;
      }

      // Redirige a donde intentaba ir, o a su dashboard según rol.
      const next = searchParams.get("next");
      const fallback = `/dashboard/${data.role}`;
      const dest =
        next && next.startsWith("/dashboard") ? next : fallback;
      router.push(dest);
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Mensaje de error del flujo de Google (?gerror=...).
  const GERR: Record<string, string> = {
    config: "La integración con Google no está configurada.",
    denied: "Cancelaste el acceso con Google.",
    nolink: "Esa cuenta de Google no está vinculada a ningún usuario. Pide a administración que la vincule.",
    rejected: "Tu acceso a la plataforma no está autorizado.",
    pending: "Tu acceso está pendiente de aprobación por un administrador.",
    session: "Inicia sesión primero para vincular Google.",
  };
  const gmsg = GERR[searchParams.get("gerror") || ""] ||
    (searchParams.get("gerror") ? "No se pudo completar el inicio con Google. Intenta de nuevo." : "");

  return (
    <div className="min-h-screen bg-[#1B2A5E] flex flex-col items-center justify-center px-6 py-12">
      {/* Corner ornaments */}
      <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-[#C9A84C]/30" />
      <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-[#C9A84C]/30" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-[#C9A84C]/30" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-[#C9A84C]/30" />

      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1
              className="text-[#F5F2EC] text-3xl mb-1"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Cobalto <span className="text-[#C9A84C] italic">Barroco</span>
            </h1>
          </Link>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-10 bg-[#C9A84C]/50" />
            <p className="text-[#F5F2EC]/40 text-xs tracking-widest uppercase">
              Acceso al sistema
            </p>
            <div className="h-px w-10 bg-[#C9A84C]/50" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#F5F2EC] p-8">
          <p className="text-[#7A7A7A] text-xs leading-relaxed mb-6 text-center">
            Ingresa con tu cuenta del servidor Cobalto Barroco.
          </p>

          {gmsg && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-700 text-xs mb-5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{gmsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User */}
            <div>
              <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-2">
                Usuario
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]"
                />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="tu.usuario"
                  className="w-full border border-[#EDE9E0] bg-white text-[#2C2C2C] pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#C0BDB8]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]"
                />
                <input
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#EDE9E0] bg-white text-[#2C2C2C] pl-9 pr-10 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#C0BDB8]"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7A7A] hover:text-[#1B2A5E]"
                >
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2.5 text-red-600 text-xs">
                <AlertCircle size={13} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B2A5E] text-[#F5F2EC] py-3.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] transition-colors duration-200 mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Verificando…" : "Ingresar"}
            </button>
          </form>

          {googleOn && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-[#EDE9E0]" />
                <span className="text-[10px] uppercase tracking-widest text-[#C0BDB8]">o</span>
                <div className="h-px flex-1 bg-[#EDE9E0]" />
              </div>
              <a
                href="/api/auth/google/start?intent=login"
                className="w-full flex items-center justify-center gap-2 border border-[#EDE9E0] bg-white text-[#2C2C2C] py-3 text-xs tracking-widest uppercase font-semibold hover:border-[#C9A84C] transition-colors"
              >
                <span className="text-[#4285F4] font-bold text-sm">G</span> Entrar con Google
              </a>
            </>
          )}
        </div>

        <p className="text-center text-[#F5F2EC]/30 text-xs mt-6">
          © {new Date().getFullYear()} Cobalto Barroco
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
