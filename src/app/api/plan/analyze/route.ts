import { NextResponse } from "next/server";
import { unauthorizedIfAnonymous } from "@/lib/auth/guard";
import { createPlanAiProvider } from "@/server/ai";
import { seedPersons } from "@/data/seed";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function isPersonId(value: string): boolean {
  return value === "levi" || value === "birgit" || value === "heidi";
}

export async function POST(request: Request) {
  const denied = await unauthorizedIfAnonymous(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const personId = String(form.get("personId") || "");
    const planTypeRaw = String(form.get("planType") || "");
    const planType = planTypeRaw === "work" ? "work" : planTypeRaw === "school" ? "school" : null;

    if (!planType) {
      return NextResponse.json({ error: "Plan-Typ fehlt (school|work)." }, { status: 400 });
    }
    if (!isPersonId(personId)) {
      return NextResponse.json({ error: "Ungültige Person." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Keine Datei hochgeladen." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Datei zu groß oder leer (max. 8 MB)." },
        { status: 400 },
      );
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED.has(mimeType) && !mimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Nur Bilder erlaubt (JPEG, PNG, WebP, HEIC)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buffer.toString("base64");
    const personNameRaw = String(form.get("personName") || "").replace(/[<>]/g, "").slice(0, 40);
    const person = seedPersons.find((p) => p.id === personId);
    const personName = personNameRaw || person?.name || personId;

    const provider = createPlanAiProvider();
    const result = await provider.analyze({
      planType,
      personId,
      personName,
      imageBase64,
      mimeType,
    });

    return NextResponse.json({
      ...result,
      provider: provider.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analyse fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
