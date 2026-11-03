import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { googleConfigured } from "@/lib/google";
import { driveConnected, driveAccountEmail } from "@/lib/drive";

export const runtime = "nodejs";

/** Estado del Drive central (solo admin): habilitado y si hay cuenta conectada. */
export async function GET() {
  const s = await getSession();
  if (!s)
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  return NextResponse.json({
    enabled: googleConfigured(),
    connected: await driveConnected(),
    email: await driveAccountEmail(),
  });
}
