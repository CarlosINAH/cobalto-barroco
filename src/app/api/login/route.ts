import { NextResponse } from "next/server";
import {
  createSessionToken,
  isAdmin,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";

// Corre en Node (usa fetch con método PROPFIND contra el NAS).
export const runtime = "nodejs";

/**
 * Valida las credenciales contra el WebDAV del NAS UGREEN.
 * Si el NAS acepta la autenticación básica, las credenciales son válidas.
 * La contraseña nunca se guarda: solo se usa para esta comprobación.
 */
async function validateNasCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const url = process.env.WEBDAV_URL;
  if (!url) throw new Error("WEBDAV_URL no está configurado");

  const auth =
    "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "PROPFIND",
      headers: { Authorization: auth, Depth: "0" },
      signal: AbortSignal.timeout(8000),
    });
    // 207 Multi-Status (éxito WebDAV) o 200; 401 = credenciales inválidas.
    return res.status === 207 || res.status === 200;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const password = body.password || "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Ingresa usuario y contraseña." },
      { status: 400 },
    );
  }

  let valid: boolean;
  try {
    valid = await validateNasCredentials(username, password);
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar con el NAS. Intenta más tarde." },
      { status: 503 },
    );
  }

  if (!valid) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 },
    );
  }

  const role = isAdmin(username) ? "admin" : "empleado";
  const token = await createSessionToken({ username, role });

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
