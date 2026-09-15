"use client";

import { GraduationCap } from "lucide-react";
import type { SchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/types";
import { Section } from "@/components/section";

/**
 * Compact School Jarvis digest for Levi’s morning dashboard.
 * Display only — no learning logic. Hidden when summary is unavailable.
 */
export function SchoolJarvisSection({
  summary,
  handoffUrl,
}: {
  summary: SchoolJarvisDailySummary;
  handoffUrl: string | null;
}) {
  if (!summary.available) return null;

  const examLine = summary.nextExam
    ? `${summary.nextExam.subject} · Prüfung in ${summary.nextExam.daysUntil} ${
        summary.nextExam.daysUntil === 1 ? "Tag" : "Tagen"
      }`
    : null;

  const studyLine = summary.today
    ? `Heute empfohlen: ${summary.today.recommendedStudyMinutes} Min. lernen`
    : null;

  const weakCount = summary.learning?.weakTopics.length ?? 0;
  const due = summary.learning?.dueFlashcards ?? 0;
  const learningBits: string[] = [];
  if (weakCount > 0) {
    learningBits.push(
      `${weakCount} schwache ${weakCount === 1 ? "Thema" : "Themen"}`,
    );
  }
  if (due > 0) {
    learningBits.push(`${due} Karteikarten fällig`);
  }

  const actionLabel = summary.action?.label ?? "Jetzt lernen";
  const canHandoff = Boolean(handoffUrl && summary.action?.target);

  return (
    <Section title="School Jarvis" emphasis="tertiary">
      <div className="space-y-3 rounded-2xl bg-[color:var(--surface)]/80 px-4 py-3">
        <div className="flex items-start gap-3">
          <GraduationCap
            className="mt-0.5 size-5 shrink-0 text-[color:var(--quiet)]"
            aria-hidden
          />
          <div className="min-w-0 space-y-2">
            {examLine ? (
              <p className="text-lg font-medium leading-snug">{examLine}</p>
            ) : null}
            {studyLine ? (
              <p className="text-base text-[color:var(--ink)]">{studyLine}</p>
            ) : null}
            {summary.today?.recommendation ? (
              <p className="text-sm text-[color:var(--quiet)]">
                {summary.today.recommendation}
              </p>
            ) : null}
            {learningBits.length > 0 ? (
              <p className="text-sm text-[color:var(--quiet)]">
                {learningBits.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
        {canHandoff ? (
          <a
            href={handoffUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[color:var(--surface-strong)] px-4 py-2 text-base font-medium transition-colors hover:opacity-90"
          >
            {actionLabel}
          </a>
        ) : null}
      </div>
    </Section>
  );
}
