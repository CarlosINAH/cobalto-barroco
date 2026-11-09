import { NextResponse } from "next/server";
import { getSession, credsForPath } from "@/lib/auth-server";
import { uploadFile } from "@/lib/webdav";
import { isShared, recordFileEvent, canAccessNasPath, projectIdForPath } from "@/lib/shared-files";
import { canDoFileAction } from "@/lib/access";
import { registrarMovimiento } from "@/lib/bitacora";

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

  // Acceso: el empleado solo sube dentro del "compartido" de sus proyectos
  // asignados; el admin, en cualquier parte.
  if (!(await canAccessNasPath(session, dir))) {
    return NextResponse.json(
      { error: "No tienes permiso de escritura en esta carpeta." },
      { status: 403 },
    );
  }

  const creds = credsForPath(session, dir);
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

  // Bitácora: registra la subida (quién, qué, en qué proyecto). Best-effort.
  if (isShared(dir)) {
    const projectId = await projectIdForPath(dir);
    const carpeta = dir.split("/").pop() || "la carpeta";
    const detalle =
      ok === 1 && files.length === 1
        ? `Subió "${files[0].name}" a ${carpeta}`
        : `Subió ${ok} archivo(s) a ${carpeta}`;
    await registrarMovimiento(session, {
      accion: "subió",
      entidad: "archivo",
      descripcion: detalle,
      projectId,
    });
  }

  return NextResponse.json({ ok: true, count: ok });
}
