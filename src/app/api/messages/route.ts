import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type Message } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

/** Bandeja: mensajes recibidos y enviados por el usuario actual. */
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  const u = session.username.toLowerCase();
  const recibidos = db.messages
    .filter((m) => m.toUsername.toLowerCase() === u)
    .sort((a, b) => b.createdAt - a.createdAt);
  const enviados = db.messages
    .filter((m) => m.fromUsername.toLowerCase() === u)
    .sort((a, b) => b.createdAt - a.createdAt);
  // Directorio de destinatarios (empleados con datos).
  const directorio = db.employees.map((e) => ({
    username: e.username,
    nombre: e.nombre,
    email: e.email,
  }));
  return NextResponse.json({ recibidos, enviados, directorio });
}

/** Enviar mensaje: guarda en la plataforma y lo manda al correo del destinatario. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let b: { to?: string; asunto?: string; cuerpo?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const to = (b.to || "").trim();
  const asunto = (b.asunto || "").trim();
  const cuerpo = (b.cuerpo || "").trim();
  if (!to || !cuerpo) {
    return NextResponse.json(
      { error: "Elige destinatario y escribe un mensaje." },
      { status: 400 },
    );
  }

  const db = await getDB();
  const dest = db.employees.find(
    (e) => e.username.toLowerCase() === to.toLowerCase(),
  );
  if (!dest) {
    return NextResponse.json(
      { error: "Destinatario no encontrado." },
      { status: 404 },
    );
  }

  // Envía el correo (si SMTP está configurado).
  const mail = await sendMail({
    to: dest.email,
    subject: `[Cobalto Barroco] ${asunto || "Nuevo mensaje"}`,
    text: `De: ${session.username}\n\n${cuerpo}\n\n— Enviado desde la plataforma Cobalto Barroco`,
  });

  const msg: Message = {
    id: newId("MSG"),
    fromUsername: session.username,
    fromNombre: session.username,
    toUsername: dest.username,
    toEmail: dest.email,
    asunto,
    cuerpo,
    emailEnviado: mail.sent,
    leido: false,
    createdAt: Date.now(),
  };
  await mutate((d) => d.messages.push(msg));

  return NextResponse.json({
    ok: true,
    emailEnviado: mail.sent,
    aviso: mail.sent
      ? null
      : dest.email
        ? "El mensaje se guardó, pero no se pudo enviar el correo (revisa la configuración SMTP)."
        : "El mensaje se guardó, pero el destinatario no tiene correo registrado.",
  });
}
