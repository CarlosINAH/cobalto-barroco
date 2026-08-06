import { NextResponse } from "next/server";
import { getDB, mutate, newId, type Inquiry } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

/** Correo de la empresa que recibe las consultas del formulario público. */
function contactInbox(): string {
  return process.env.CONTACT_TO || "contacto@cobaltobarroco.com";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Formulario de contacto público (sin sesión). Guarda siempre la consulta en la
 * plataforma y, si el SMTP está configurado, la reenvía al correo de la empresa.
 * Nunca se pierde un mensaje aunque el correo no esté disponible.
 */
export async function POST(req: Request) {
  let b: { nombre?: string; email?: string; telefono?: string; mensaje?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const nombre = (b.nombre || "").trim();
  const email = (b.email || "").trim();
  const telefono = (b.telefono || "").trim();
  const mensaje = (b.mensaje || "").trim();

  if (!nombre || !email || !mensaje) {
    return NextResponse.json(
      { error: "Completa tu nombre, correo y mensaje." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "El correo electrónico no es válido." },
      { status: 400 },
    );
  }
  if (mensaje.length > 5000) {
    return NextResponse.json(
      { error: "El mensaje es demasiado largo." },
      { status: 400 },
    );
  }

  const mail = await sendMail({
    to: contactInbox(),
    subject: `[Cobalto Barroco] Nueva consulta de ${nombre}`,
    text:
      `Nombre: ${nombre}\n` +
      `Correo: ${email}\n` +
      `Teléfono: ${telefono || "—"}\n\n` +
      `${mensaje}\n\n` +
      `— Enviado desde el formulario de contacto de cobaltobarroco.com`,
  });

  const inquiry: Inquiry = {
    id: newId("CNS"),
    nombre,
    email,
    telefono,
    mensaje,
    emailEnviado: mail.sent,
    leido: false,
    createdAt: Date.now(),
  };
  // getDB() garantiza que el archivo existe/está normalizado antes de escribir.
  await getDB();
  await mutate((d) => d.inquiries.push(inquiry));

  return NextResponse.json({ ok: true, emailEnviado: mail.sent });
}
