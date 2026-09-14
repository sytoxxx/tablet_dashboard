import { NextResponse } from "next/server";
import { askJarvis } from "@/lib/jarvis/ask";
import { phraseJarvisWithOpenAi, withAiAnswer } from "@/server/jarvis/phrase";
import { seedAppData } from "@/data/seed";
import type { AppData, PersonId, PersonProfile } from "@/lib/types";
import type { MorningOverviewLive } from "@/lib/morning/overview";

export const runtime = "nodejs";

function isPersonId(value: string): value is PersonId {
  return value === "levi" || value === "birgit" || value === "heidi";
}

/**
 * POST /api/jarvis/ask
 * Body: { personId, question, nowIso?, person?, live? }
 * OPENAI_API_KEY only on server — never returned to client.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      personId?: string;
      question?: string;
      nowIso?: string;
      person?: PersonProfile;
      data?: AppData;
      live?: MorningOverviewLive;
      preferAi?: boolean;
    };

    if (!body.personId || !isPersonId(body.personId)) {
      return NextResponse.json(
        { ok: false, error: "Ungültige Person." },
        { status: 400 },
      );
    }

    const question = String(body.question ?? "");
    const now = body.nowIso ? new Date(body.nowIso) : new Date();
    if (Number.isNaN(now.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Ungültige Zeit." },
        { status: 400 },
      );
    }

    const person =
      body.person?.id === body.personId
        ? body.person
        : (body.data ?? seedAppData).persons.find((p) => p.id === body.personId);

    if (!person) {
      return NextResponse.json(
        { ok: false, error: "Person nicht gefunden." },
        { status: 404 },
      );
    }

    let response = askJarvis(body.personId, question, now, {
      person,
      data: body.data,
      live: body.live,
    });

    const preferAi = body.preferAi !== false;
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (preferAi && apiKey && response.intent !== "empty") {
      const polished = await phraseJarvisWithOpenAi({
        apiKey,
        question,
        deterministicAnswer: response.deterministicAnswer,
        facts: response.facts,
      });
      response = withAiAnswer(response, polished);
    }

    return NextResponse.json({
      ok: true,
      ...response,
      aiAvailable: Boolean(apiKey),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Jarvis ist gerade nicht erreichbar.",
        answer: "Dazu habe ich aktuell keine Daten. Bitte später erneut fragen.",
      },
      { status: 503 },
    );
  }
}
