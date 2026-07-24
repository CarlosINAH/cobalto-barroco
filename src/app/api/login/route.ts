import { NextResponse } from "next/server";
import {
  createSessionToken,
  isAdmin,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";
import { checkCredentials } from "@/lib/webdav";

// Corre en Node (WebDAV / Buffer).
export const runtime = "nodejs";

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

  // Modo desarrollo local: permite entrar sin NAS (nunca activo en producción).
  const devLogin =
    process.env.DEV_LOGIN === "true" &&
    process.env.NODE_ENV !== "production";

  // Valida las credenciales contra el NAS (WebDAV).
  const valid = devLogin || (await checkCredentials({ username, password }));
  if (!valid) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 },
    );
  }

  const role = isAdmin(username) ? "admin" : "empleado";
  const token = await createSessionToken({ username, role, pw: password });

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
