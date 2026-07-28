import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { uploadFile } from "@/lib/webdav";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
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

  const creds = credsOf(session);
  let ok = 0;
  for (const file of files) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const target = dir ? `${dir}/${file.name}` : file.name;
    try {
      if (await uploadFile(creds, target, buf)) ok++;
    } catch {
      /* continúa con los demás */
    }
  }

  if (ok === 0) {
    return NextResponse.json(
      { error: "No se pudo guardar en esa ubicación (¿permiso del NAS?)." },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true, count: ok });
}
