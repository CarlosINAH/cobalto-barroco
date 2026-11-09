import Link from "next/link";

export const metadata = {
  title: "Condiciones del Servicio — Cobalto Barroco",
  description: "Condiciones del Servicio de la plataforma de gestión de Cobalto Barroco.",
};

const ACTUALIZADO = "2 de noviembre de 2026";

/** Condiciones del Servicio públicas (requeridas por la pantalla de
 *  consentimiento de Google). Texto genérico; ajústalo si hace falta. */
export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#F5F2EC] text-[#2C2C2C] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-[#1B2A5E] text-2xl inline-block mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
          Cobalto <span className="text-[#C9A84C] italic">Barroco</span>
        </Link>
        <h1 className="text-[#1B2A5E] text-3xl mt-4 mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Condiciones del Servicio
        </h1>
        <p className="text-sm text-[#7A7A7A] mb-8">Última actualización: {ACTUALIZADO}</p>

        <div className="space-y-6 text-sm leading-relaxed text-[#444]">
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">1. Aceptación</h2>
            <p>Al acceder y usar esta plataforma, aceptas estas Condiciones del Servicio. La plataforma es una herramienta interna de Cobalto Barroco para la gestión de proyectos de restauración y conservación, destinada a personal autorizado.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">2. Uso permitido</h2>
            <p>Te comprometes a usar la plataforma únicamente para fines relacionados con tu trabajo en la organización, de forma lícita y de acuerdo con los permisos que te asigne la administración. No debes intentar acceder a información o funciones para las que no estés autorizado.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">3. Cuentas y acceso</h2>
            <p>Eres responsable de mantener la confidencialidad de tus credenciales y de la actividad realizada desde tu cuenta. El acceso puede otorgarse, limitarse o revocarse por la administración en cualquier momento.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">4. Contenido y datos</h2>
            <p>La información, proyectos, presupuestos y archivos gestionados en la plataforma pertenecen a Cobalto Barroco. Debes tratar dicha información como confidencial y no divulgarla fuera de la organización sin autorización.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">5. Integraciones de terceros</h2>
            <p>La plataforma puede integrarse con servicios de Google (inicio de sesión, Google Drive) y con servicios de inteligencia artificial para funciones de apoyo. El uso de esos servicios se rige además por sus propios términos.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">6. Disponibilidad y responsabilidad</h2>
            <p>La plataforma se ofrece &ldquo;tal cual&rdquo;, sin garantías de disponibilidad ininterrumpida. La organización no será responsable por pérdidas derivadas de un uso indebido o de interrupciones del servicio.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">7. Cambios</h2>
            <p>Estas condiciones pueden actualizarse. El uso continuado de la plataforma tras una actualización implica la aceptación de los cambios.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">8. Contacto</h2>
            <p>Para dudas sobre estas condiciones, escribe a la administración de Cobalto Barroco.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-[#EDE9E0] text-sm">
          <Link href="/privacidad" className="text-[#1B2A5E] hover:text-[#C9A84C] underline">Política de Privacidad</Link>
          <span className="text-[#C0BDB8] mx-2">·</span>
          <Link href="/login" className="text-[#1B2A5E] hover:text-[#C9A84C] underline">Acceder</Link>
        </div>
      </div>
    </main>
  );
}
