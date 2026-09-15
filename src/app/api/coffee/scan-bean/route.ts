import { NextResponse } from "next/server";
import { unauthorizedIfAnonymous } from "@/lib/auth/guard";
import { createBeanScanAiProvider } from "@/server/ai/bean-factory";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(request: Request) {
  const denied = await unauthorizedIfAnonymous(request);
  if (denied) return denied;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Keine Datei hochgeladen." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Datei zu groß oder leer (max. 8 MB)." },
        { status: 400 },
      );
    }

    // Only allowlisted camera formats — do not accept arbitrary image/* (e.g. SVG).
    const mimeType = file.type;
    if (!ALLOWED.has(mimeType)) {
      return NextResponse.json(
        { error: "Nur Bilder erlaubt (JPEG, PNG, WebP, HEIC)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buffer.toString("base64");
    const provider = createBeanScanAiProvider();
    const result = await provider.analyze({ imageBase64, mimeType });

    return NextResponse.json({
      ...result,
      provider: provider.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
