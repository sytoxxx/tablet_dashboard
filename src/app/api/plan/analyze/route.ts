import { NextResponse } from "next/server";
import { unauthorizedIfAnonymous } from "@/lib/auth/guard";
import { createPlanAiProvider } from "@/server/ai";
import { seedPersons } from "@/data/seed";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per page/photo
const MAX_PAGES = 12;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function isPersonId(value: string): boolean {
  return value === "levi" || value === "birgit" || value === "heidi";
}

export async function POST(request: Request) {
  const denied = await unauthorizedIfAnonymous(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    // Multi-page upload sends several "file" entries (one per page/photo);
    // a single upload is just one. Both flow through the same array.
    const files = form.getAll("file").filter((f): f is File => f instanceof File);
    const personId = String(form.get("personId") || "");
    const planTypeRaw = String(form.get("planType") || "");
    const planType = planTypeRaw === "work" ? "work" : planTypeRaw === "school" ? "school" : null;

    if (!planType) {
      return NextResponse.json({ error: "Plan-Typ fehlt (school|work)." }, { status: 400 });
    }
    if (!isPersonId(personId)) {
      return NextResponse.json({ error: "Ungültige Person." }, { status: 400 });
    }
    if (files.length === 0) {
      return NextResponse.json({ error: "Keine Datei hochgeladen." }, { status: 400 });
    }
    if (files.length > MAX_PAGES) {
      return NextResponse.json(
        { error: `Zu viele Seiten (max. ${MAX_PAGES}).` },
        { status: 400 },
      );
    }

    const images: { base64: string; mimeType: string }[] = [];
    for (const file of files) {
      if (file.size <= 0 || file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "Datei zu groß oder leer (max. 8 MB pro Seite)." },
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
      images.push({ base64: buffer.toString("base64"), mimeType });
    }

    const personNameRaw = String(form.get("personName") || "").replace(/[<>]/g, "").slice(0, 40);
    const person = seedPersons.find((p) => p.id === personId);
    const personName = personNameRaw || person?.name || personId;

    const provider = createPlanAiProvider();
    const result = await provider.analyze({
      planType,
      personId,
      personName,
      images,
      referenceDate: new Date(),
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
