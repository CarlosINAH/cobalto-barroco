import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { saveFile } from "@/lib/files";

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

  try {
    for (const file of files) {
      const buf = new Uint8Array(await file.arrayBuffer());
      await saveFile(session, dir, file.name, buf);
    }
    return NextResponse.json({ ok: true, count: files.length });
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar en esa ubicación." },
      { status: 403 },
    );
  }
}
