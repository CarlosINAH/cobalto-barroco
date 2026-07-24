import "server-only";
import nodemailer from "nodemailer";

/**
 * Envío de correo por SMTP. Configurado por variables de entorno:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * Si no está configurado, no falla: devuelve { sent:false } para que el mensaje
 * quede guardado en la plataforma aunque no se pueda enviar el email.
 */

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export function mailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) return { sent: false, error: "SMTP no configurado" };
  if (!opts.to) return { sent: false, error: "Sin destinatario" };
  try {
    const from =
      process.env.SMTP_FROM ||
      `Cobalto Barroco <${process.env.SMTP_USER}>`;
    await t.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "error" };
  }
}
