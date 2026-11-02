import "server-only";

/**
 * Cliente OAuth 2.0 de Google (sin SDK, solo fetch a los endpoints REST). Cubre
 * identidad (iniciar sesión / vincular cuenta) y, más adelante, Drive. Todo
 * detrás de variables de entorno: si no están configuradas, la función
 * `googleConfigured()` devuelve false y la plataforma ignora el flujo.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

/** Scopes de identidad (login/vinculación). Drive se añade en su propio flujo. */
export const IDENTITY_SCOPES = ["openid", "email", "profile"];

/** Scopes para conectar el Drive central (acceso completo de archivos + correo). */
export const DRIVE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/drive",
];

export function googleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}

/** URL de consentimiento de Google a la que se redirige al usuario. */
export function googleAuthUrl(
  state: string,
  opts?: { scopes?: string[]; accessType?: "online" | "offline"; prompt?: string },
): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: (opts?.scopes ?? IDENTITY_SCOPES).join(" "),
    state,
    access_type: opts?.accessType ?? "online",
    include_granted_scopes: "true",
  });
  if (opts?.prompt) params.set("prompt", opts.prompt);
  return `${AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
}

/** Canjea el `code` del callback por tokens de acceso. */
export async function googleExchangeCode(code: string): Promise<GoogleTokens | null> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  return (await res.json()) as GoogleTokens;
}

/** Canjea un refresh token por un access token nuevo (Drive central). */
export async function googleRefreshAccessToken(refreshToken: string): Promise<string | null> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export interface GoogleUser {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
}

/** Perfil básico del usuario a partir del access token (OpenID userinfo). */
export async function googleUserInfo(accessToken: string): Promise<GoogleUser | null> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as GoogleUser;
}
