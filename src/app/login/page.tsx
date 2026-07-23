"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Info } from "lucide-react";
import Link from "next/link";

// Demo accounts — only for exploration of the prototype.
// Eventually this will be replaced by Supabase Auth.
const DEMO_ACCOUNTS = [
  { user: "admin", pass: "admin", role: "admin" as const },
  { user: "empleado", pass: "empleado", role: "empleado" as const },
];

export default function LoginPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<"empleado" | "admin">("admin");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const match = DEMO_ACCOUNTS.find(
      (a) => a.user === user.trim().toLowerCase() && a.pass === pass
    );

    if (!match) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }

    // Redirect according to the account's actual role (ignoring the selector if it doesn't match)
    router.push(`/dashboard/${match.role}`);
  };

  const fillDemo = (account: typeof DEMO_ACCOUNTS[number]) => {
    setUser(account.user);
    setPass(account.pass);
    setRole(account.role);
    setError("");
  };

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

        {/* Demo credentials helper */}
        <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 p-4 mb-5">
          <div className="flex items-start gap-2 mb-3">
            <Info size={14} className="text-[#C9A84C] mt-0.5 shrink-0" />
            <p className="text-[#C9A84C] text-xs leading-relaxed">
              <span className="font-bold uppercase tracking-wider">
                Cuentas de prueba
              </span>
              <br />
              <span className="text-[#F5F2EC]/60">
                Click para autocompletar
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.user}
                type="button"
                onClick={() => fillDemo(acc)}
                className="border border-[#C9A84C]/40 hover:border-[#C9A84C] bg-[#1B2A5E]/40 hover:bg-[#1B2A5E] py-2 px-3 text-left transition-all"
              >
                <p className="text-[#C9A84C] text-xs tracking-widest uppercase font-bold mb-0.5">
                  {acc.role}
                </p>
                <p className="text-[#F5F2EC]/70 text-xs font-mono">
                  {acc.user} / {acc.pass}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#F5F2EC] p-8">
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {(["empleado", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-2.5 text-xs tracking-widest uppercase font-semibold transition-all duration-200 ${
                  role === r
                    ? "bg-[#1B2A5E] text-[#C9A84C]"
                    : "bg-[#EDE9E0] text-[#7A7A7A] hover:bg-[#E0DDD5]"
                }`}
              >
                {r === "admin" ? "Administrador" : "Empleado"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User */}
            <div>
              <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-2">
                Usuario
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]"
                />
                <input
                  type="text"
                  required
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="admin"
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

            <div className="flex justify-end">
              <a
                href="#"
                className="text-xs text-[#C9A84C] hover:underline tracking-wide"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-[#1B2A5E] text-[#F5F2EC] py-3.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] transition-colors duration-200 mt-2"
            >
              Ingresar
            </button>
          </form>
        </div>

        <p className="text-center text-[#F5F2EC]/30 text-xs mt-6">
          © {new Date().getFullYear()} Cobalto Barroco
        </p>
      </div>
    </div>
  );
}
