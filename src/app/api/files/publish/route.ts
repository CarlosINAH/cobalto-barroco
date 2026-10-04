import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { makeDirectory, moveEntry } from "@/lib/webdav";
import {
  SHARED_ROOT,
  isShared,
  recordFolderCreated,
  setFolderShare,
  grantTopFolderVisibility,
  employeeDirectory,
} from "@/lib/shared-files";

export const runtime = "nodejs";

const norm = (p: string) => (p || "").replace(/^\/+/, "").replace(/\/+$/, "");

/** Directorio de empleados para el selector de "Compartir con el equipo". */
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const employees = (await employeeDirectory()).filter(
    (e) => e.username.toLowerCase() !== session.username.toLowerCase(),
  );
  return NextResponse.json({ employees });
}

/**
 * Publica una carpeta de la Nube personal en "Archivos compartidos" para
 * colaborar con el equipo. Mueve la carpeta (una sola copia, sin duplicar),
 * registra quién la compartió y cuándo, y define con qué empleados se comparte
 * (el administrador siempre tiene acceso).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let b: { path?: string; allowed?: string[] | null };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const source = norm(b.path || "");
  if (!source) {
    return NextResponse.json(
      { error: "Elige una carpeta para compartir." },
      { status: 400 },
    );
  }
  if (isShared(source)) {
    return NextResponse.json(
      { error: "Esa carpeta ya está en Archivos compartidos." },
      { status: 400 },
    );
  }

  const name = source.split("/").pop() as string;
  const dest = `${SHARED_ROOT}/${name}`;
  const allowed =
    b.allowed === null ? null : Array.isArray(b.allowed) ? b.allowed : null;

  const creds = credsOf(session);
  try {
    // Asegura que exista la raíz compartida antes de mover.
    await makeDirectory(creds, SHARED_ROOT);

    const mv = await moveEntry(creds, source, dest);
    if (!mv.ok) {
      if (mv.status === 412) {
        return NextResponse.json(
          {
            error: `Ya existe una carpeta llamada "${name}" en Archivos compartidos. Renómbrala antes de compartir.`,
          },
          { status: 409 },
        );
      }
      if (mv.status === 401 || mv.status === 403) {
        return NextResponse.json(
          { error: "El NAS no permitió mover esta carpeta." },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "No se pudo compartir la carpeta." },
        { status: 502 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar al NAS." },
      { status: 502 },
    );
  }

  // Registra dueño + fecha/hora y aplica el acceso elegido.
  await recordFolderCreated(dest, session.username);
  await setFolderShare(dest, session, allowed);

  // Que la carpeta no quede oculta por una restricción de visibilidad del admin:
  // el dueño y los colegas elegidos deben poder verla.
  const beneficiarios = [session.username, ...(allowed ?? [])];
  await grantTopFolderVisibility(beneficiarios, name);

  return NextResponse.json({ ok: true, path: dest });
}
