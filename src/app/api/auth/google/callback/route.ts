import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  openOAuthState,
  createSessionToken,
  isAdmin,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";
import { googleConfigured, googleExchangeCode, googleUserInfo } from "@/lib/google";
import { getDB, mutate } from "@/lib/db";
import { evaluateAccess } from "@/lib/access";

export const runtime = "nodejs";

const norm = (s: string) => s.trim().toLowerCase();

function dashboardFor(username: string): string {
  return isAdmin(username) ? "/dashboard/admin" : "/dashboard/empleado";
}

/**
 * Callback de Google OAuth. Según el `intent` sellado en el `state`:
 * - login: identifica al empleado por su Google vinculado y, si la plataforma
 *   lo aprueba, crea la sesión.
 * - link: guarda la identidad de Google en el empleado ya autenticado.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = url.origin;
  const fail = (code: string) => NextResponse.redirect(`${base}/login?gerror=${code}`);

  if (!googleConfigured()) return fail("config");
  if (url.searchParams.get("error")) return fail("denied");

  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  if (!code || !stateRaw) return fail("request");

  const state = await openOAuthState(stateRaw);
  if (!state) return fail("state");
  const intent = state.intent === "link" ? "link" : "login";

  const tokens = await googleExchangeCode(code);
  if (!tokens) return fail("exchange");
  const user = await googleUserInfo(tokens.access_token);
  if (!user?.sub || !user.email) return fail("userinfo");
  const email = norm(user.email);
  const sub = user.sub;

  // ── Vincular Google a la cuenta ya iniciada ──
  if (intent === "link") {
    const session = await getSession();
    if (!session || session.username !== String(state.username || "")) return fail("session");
    const db = await getDB();
    // Evita que dos cuentas compartan la misma identidad de Google.
    const ocupada = db.employees.find(
      (e) => norm(e.username) !== norm(session.username) &&
        (e.googleSub === sub || (e.googleEmail && norm(e.googleEmail) === email)),
    );
    if (ocupada) return NextResponse.redirect(`${base}${dashboardFor(session.username)}/configuracion?glink=dupe`);
    await mutate((d) => {
      const emp = d.employees.find((e) => norm(e.username) === norm(session.username));
      if (emp) { emp.googleSub = sub; emp.googleEmail = email; }
    });
    return NextResponse.redirect(`${base}${dashboardFor(session.username)}/configuracion?glink=ok`);
  }

  // ── Iniciar sesión con Google ──
  const db = await getDB();
  const emp =
    db.employees.find((e) => e.googleSub === sub) ||
    db.employees.find((e) => e.googleEmail && norm(e.googleEmail) === email) ||
    (user.email_verified !== false
      ? db.employees.find((e) => e.email && norm(e.email) === email)
      : undefined);
  if (!emp) return fail("nolink");

  const decision = await evaluateAccess(emp.username);
  if (decision === "rejected") return fail("rejected");
  if (decision === "pending") return fail("pending");

  const role = isAdmin(emp.username) ? "admin" : "empleado";
  // Sesión de Google: sin credencial del NAS (pw vacío). Usa el área compartida
  // y Drive; la "Nube" personal del NAS requiere login con usuario/contraseña.
  const token = await createSessionToken({ username: emp.username, role, pw: "" });
  const res = NextResponse.redirect(`${base}${dashboardFor(emp.username)}`);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
