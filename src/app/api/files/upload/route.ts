import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { uploadFile } from "@/lib/webdav";
import { isShared, recordFileEvent, canWriteSharedPath } from "@/lib/shared-files";
import { canDoFileAction } from "@/lib/access";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Autorización global de acción (matriz del Excel): ¿puede subir?
  if (!(await canDoFileAction(session.username, session.role, "subir"))) {
    return NextResponse.json(
      { error: "No tienes permiso para subir archivos." },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const dir = (form.get("path") as string) || "";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo." },
      { status: 400 },
    );
  }

  // En el área compartida, solo quien tenga escritura o acceso total.
  if (
    isShared(dir) &&
    !(await canWriteSharedPath(session.username, session.role, dir))
  ) {
    return NextResponse.json(
      { error: "No tienes permiso de escritura en esta carpeta." },
      { status: 403 },
    );
  }

  const creds = credsOf(session);
  let ok = 0;
  let lastStatus = 0;
  for (const file of files) {
    const target = dir ? `${dir}/${file.name}` : file.name;
    try {
      // Pasa el File directo: se transmite como stream, sin copiarlo a memoria.
      const { ok: uploaded, status } = await uploadFile(creds, target, file);
      if (uploaded) {
        ok++;
        if (isShared(target)) {
          await recordFileEvent(target, file.name, session.username);
        }
      } else {
        lastStatus = status;
      }
    } catch {
      /* continúa con los demás (timeout/red): queda reflejado en ok === 0) */
    }
  }

  if (ok === 0) {
    const msg =
      lastStatus === 507
        ? "No hay espacio suficiente en el NAS."
        : lastStatus === 413
          ? "El archivo es demasiado grande para el NAS."
          : lastStatus === 401 || lastStatus === 403
            ? "El NAS rechazó la subida por permisos."
            : "No se pudo guardar en esa ubicación (¿permiso o espacio del NAS?).";
    const code = lastStatus === 507 || lastStatus === 413 ? lastStatus : 403;
    return NextResponse.json({ error: msg }, { status: code });
  }
  return NextResponse.json({ ok: true, count: ok });
}
