import { NextResponse } from "next/server";
import {
  createSessionToken,
  isAdmin,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";
import { checkCredentials } from "@/lib/webdav";
import { evaluateAccess } from "@/lib/access";

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

  // Control de acceso a la plataforma (aprobación por el administrador).
  const decision = await evaluateAccess(username);
  if (decision === "pending") {
    return NextResponse.json(
      {
        error:
          "Tu acceso está pendiente de aprobación por un administrador. Te avisaremos cuando esté listo.",
        pending: true,
      },
      { status: 403 },
    );
  }
  if (decision === "rejected") {
    return NextResponse.json(
      {
        error:
          "Tu acceso a la plataforma no fue autorizado. Contacta a la administración.",
      },
      { status: 403 },
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
