import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { driveAccessToken, driveUpload, type DriveEntry } from "@/lib/drive";
import { drivePermsForSession } from "@/lib/drive-perms";

export const runtime = "nodejs";

/** Sube uno o varios archivos a una carpeta del Drive central (rol con permiso de subir). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!(await drivePermsForSession(s)).subir)
    return NextResponse.json({ error: "No tienes permiso para subir archivos." }, { status: 403 });
  const token = await driveAccessToken();
  if (!token)
    return NextResponse.json({ error: "Drive no conectado." }, { status: 409 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const folderId = (form.get("folderId") as string) || "root";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0)
    return NextResponse.json({ error: "No se adjuntaron archivos." }, { status: 400 });

  const subidos: DriveEntry[] = [];
  try {
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      subidos.push(await driveUpload(token, file.name, file.type, bytes, folderId));
    }
  } catch {
    return NextResponse.json({ error: "No se pudieron subir todos los archivos." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, subidos });
}
