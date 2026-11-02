import Link from "next/link";

export const metadata = {
  title: "Política de Privacidad — Cobalto Barroco",
  description: "Política de Privacidad de la plataforma de gestión de Cobalto Barroco.",
};

const ACTUALIZADO = "2 de noviembre de 2026";

/** Política de Privacidad pública (requerida por la pantalla de consentimiento
 *  de Google). Texto genérico; ajústalo a tu operación real si hace falta. */
export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-[#F5F2EC] text-[#2C2C2C] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-[#1B2A5E] text-2xl inline-block mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
          Cobalto <span className="text-[#C9A84C] italic">Barroco</span>
        </Link>
        <h1 className="text-[#1B2A5E] text-3xl mt-4 mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Política de Privacidad
        </h1>
        <p className="text-sm text-[#7A7A7A] mb-8">Última actualización: {ACTUALIZADO}</p>

        <div className="space-y-6 text-sm leading-relaxed text-[#444]">
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">1. Quiénes somos</h2>
            <p>Esta plataforma es una herramienta interna de gestión de proyectos de restauración y conservación operada por Cobalto Barroco. Su uso está destinado a personal autorizado de la empresa.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">2. Qué información tratamos</h2>
            <p>Recopilamos únicamente los datos necesarios para operar la plataforma: nombre de usuario y datos de perfil del personal, información de proyectos, presupuestos, movimientos administrativos y archivos que se suban. Si inicias sesión con Google, obtenemos tu nombre, dirección de correo y el identificador de tu cuenta de Google para identificarte dentro de la plataforma.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">3. Uso de los servicios de Google</h2>
            <p>La plataforma puede vincularse con tu cuenta de Google para iniciar sesión y, para la administración, para gestionar archivos en Google Drive de la organización. El acceso a Google Drive se usa solo para listar, subir, descargar y organizar los archivos de la empresa dentro de la propia plataforma. El uso de la información recibida de las APIs de Google se ajusta a la Política de Datos de Usuario de los Servicios de API de Google, incluidos sus requisitos de uso limitado.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">4. Cómo se usa la información</h2>
            <p>Los datos se usan para prestar y mantener el servicio: autenticación, gestión de proyectos, control administrativo y resguardo de archivos. No vendemos ni compartimos la información con terceros con fines publicitarios.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">5. Almacenamiento y seguridad</h2>
            <p>La información se almacena en la infraestructura propia de la organización y se protege con credenciales y controles de acceso por rol. Las credenciales sensibles (tokens, contraseñas) se guardan cifradas.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">6. Conservación y eliminación</h2>
            <p>Los datos se conservan mientras la cuenta esté activa y sean necesarios para la operación. Puedes desvincular tu cuenta de Google en cualquier momento desde Configuración, y solicitar la eliminación de tus datos al administrador.</p>
          </section>
          <section>
            <h2 className="text-[#1B2A5E] font-semibold mb-1">7. Contacto</h2>
            <p>Para cualquier consulta sobre esta política o sobre tus datos, escribe a la administración de Cobalto Barroco.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-[#EDE9E0] text-sm">
          <Link href="/terminos" className="text-[#1B2A5E] hover:text-[#C9A84C] underline">Condiciones del Servicio</Link>
          <span className="text-[#C0BDB8] mx-2">·</span>
          <Link href="/login" className="text-[#1B2A5E] hover:text-[#C9A84C] underline">Acceder</Link>
        </div>
      </div>
    </main>
  );
}
