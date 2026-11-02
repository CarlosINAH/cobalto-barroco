import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { sealOAuthState } from "@/lib/session";
import { googleConfigured, googleAuthUrl, DRIVE_SCOPES } from "@/lib/google";

export const runtime = "nodejs";

/**
 * Inicia el flujo OAuth de Google y redirige a la pantalla de consentimiento.
 * `intent=login` para iniciar sesión; `intent=link` para vincular Google a la
 * cuenta ya iniciada; `intent=drive` para conectar el Drive central (solo
 * admin, pide acceso offline para obtener un refresh token). El `state` va
 * sellado (cifrado y con caducidad) para no poder falsificarse.
 */
export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  if (!googleConfigured()) {
    return NextResponse.redirect(`${base}/login?gerror=config`);
  }
  const raw = new URL(req.url).searchParams.get("intent");
  const intent = raw === "link" ? "link" : raw === "drive" ? "drive" : "login";

  let username = "";
  if (intent === "link") {
    const session = await getSession();
    if (!session) return NextResponse.redirect(`${base}/login?gerror=session`);
    username = session.username;
  }
  if (intent === "drive") {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(`${base}/login?gerror=session`);
    }
    username = session.username;
    const nonce = crypto.randomUUID();
    const state = await sealOAuthState({ intent, username, nonce });
    // offline + consent fuerza la entrega de un refresh token reutilizable.
    return NextResponse.redirect(
      googleAuthUrl(state, { scopes: DRIVE_SCOPES, accessType: "offline", prompt: "consent" }),
    );
  }

  const nonce = crypto.randomUUID();
  const state = await sealOAuthState({ intent, username, nonce });
  return NextResponse.redirect(googleAuthUrl(state, { prompt: "select_account" }));
}
