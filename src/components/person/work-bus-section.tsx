import {
  countdownLabel,
  departureDayHint,
  type BusUpcomingEntry,
  type WorkBusGlance,
} from "@/lib/morning/work-bus-glance";
import { Section } from "@/components/section";
import type { ClarityEmphasis } from "@/components/clarity-block";
import { cn } from "@/lib/utils";

/** One row of the "next 3 buses" list — every real fact shown, nothing invented. */
function UpcomingBusRow({ entry, now }: { entry: BusUpcomingEntry; now: Date }) {
  const cancelled = entry.cancelled === true || entry.status === "CANCELLED";
  const delay =
    !cancelled && typeof entry.delayMinutes === "number" && entry.delayMinutes > 0
      ? entry.delayMinutes
      : null;
  const dayHint = departureDayHint(entry, now);

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5 sm:px-5",
        cancelled ? "bg-[color:var(--surface)]/60" : "bg-[color:var(--surface)]",
      )}
    >
      <div className="flex min-w-0 items-baseline gap-3">
        <p
          className={cn(
            "font-display text-3xl tabular-nums tracking-tight sm:text-4xl",
            cancelled && "text-[color:var(--quiet)] line-through decoration-1",
          )}
        >
          {entry.time}
        </p>
        <p className="min-w-0 truncate text-lg font-medium text-[color:var(--ink)] sm:text-xl">
          {entry.line && entry.line !== "?" ? `Linie ${entry.line}` : null}
          {entry.line && entry.line !== "?" && entry.destination ? " → " : null}
          {entry.destination || null}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {cancelled ? (
          <p className="text-base font-medium text-[color:var(--destructive)]">⚠️ Fällt aus</p>
        ) : (
          <>
            <p className="text-base text-[color:var(--quiet)]">
              {dayHint ? `${dayHint} · ` : ""}
              {countdownLabel(entry, now)}
            </p>
            {delay ? (
              <p className="text-base font-medium text-[color:var(--destructive)]">+{delay} Min.</p>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

/**
 * Birgit/Heidi commute block — sits directly under Arbeitszeit.
 * Alerts only when resolveWorkBusGlance found real delay/cancel/deviation.
 */
export function WorkBusSection({
  glance,
  emphasis = "hero",
  upcomingList,
  listNotice,
  compact = false,
  now,
}: {
  glance: WorkBusGlance;
  emphasis?: ClarityEmphasis;
  /** When provided (Heidi), renders up to 3 real upcoming departures instead of just one. */
  upcomingList?: BusUpcomingEntry[];
  /** Shown instead of rows when there are none: "nicht verfügbar", "keine Verbindung", "wird geladen". */
  listNotice?: string | null;
  /** One calm line instead of the big hero time — used when a second bus card is on screen. */
  compact?: boolean;
  now?: Date;
}) {
  if (!glance.visible) return null;

  const isAlert =
    glance.kind === "cancelled" || glance.kind === "deviation";
  const isDelay = glance.kind === "delay";

  if (upcomingList) {
    return (
      <Section title={glance.title} emphasis={emphasis}>
        {upcomingList.length > 0 ? (
          <ul className="space-y-2">
            {upcomingList.map((entry, i) => (
              <UpcomingBusRow key={`${entry.time}-${i}`} entry={entry} now={now ?? new Date()} />
            ))}
          </ul>
        ) : (
          <p className="text-xl text-[color:var(--ink)]" data-testid="bus-list-notice">
            {listNotice ?? glance.alertDetail?.trim() ?? "Keine passende Verbindung gefunden."}
          </p>
        )}
        {glance.isTestData ? (
          <p className="mt-3 text-sm text-[color:var(--quiet)]">
            Testdaten — keine Live-Abfahrt
          </p>
        ) : null}
        {glance.hint ? (
          <p className="mt-3 text-sm text-[color:var(--quiet)]">{glance.hint}</p>
        ) : null}
      </Section>
    );
  }

  // Quiet empty — short natural line, no empty card chrome.
  if (
    glance.kind === "none" &&
    !glance.time &&
    !glance.leaveHome &&
    !glance.lineTarget &&
    glance.alertDetail
  ) {
    return (
      <Section title={glance.title} emphasis="tertiary">
        <p className="text-lg text-[color:var(--quiet)]">{glance.alertDetail}</p>
        {glance.hint ? (
          <p className="mt-2 text-sm text-[color:var(--quiet)]">{glance.hint}</p>
        ) : null}
      </Section>
    );
  }

  if (compact && !isAlert && (glance.time || glance.leaveHome)) {
    return (
      <Section title={glance.title} emphasis="secondary">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <p className="font-display text-4xl tabular-nums tracking-tight">
            {glance.time ?? glance.leaveHome}
          </p>
          {glance.lineTarget ? (
            <p className="text-xl font-medium text-[color:var(--ink)]">{glance.lineTarget}</p>
          ) : null}
          {glance.leaveHome && glance.time && glance.leaveHome !== glance.time ? (
            <p className="text-lg text-[color:var(--quiet)]">
              Los um <span className="tabular-nums text-[color:var(--ink)]">{glance.leaveHome}</span>
            </p>
          ) : null}
        </div>
      </Section>
    );
  }

  return (
    <Section title={glance.title} emphasis={isAlert ? "hero" : emphasis}>
      {isAlert && glance.alertTitle ? (
        <p className="text-xl font-medium text-[color:var(--ink)] sm:text-2xl landscape-tablet:text-2xl">
          {glance.alertTitle}
        </p>
      ) : null}

      {glance.kind === "deviation" && glance.alertDetail ? (
        <p className="mt-2 whitespace-pre-line text-lg text-[color:var(--ink)]">
          {glance.alertDetail}
        </p>
      ) : null}

      {glance.kind === "cancelled" ? (
        <div className={cn(glance.alertTitle ? "mt-4" : undefined)}>
          {glance.nextTime ? (
            <>
              <p className="text-base text-[color:var(--quiet)]">
                Nächste Verbindung
              </p>
              <p className="mt-1 font-display text-5xl tabular-nums tracking-tight sm:text-6xl landscape-tablet:text-5xl">
                {glance.nextTime}
              </p>
              {glance.nextLineTarget ? (
                <p className="mt-3 text-xl font-medium text-[color:var(--ink)] landscape-tablet:text-2xl">
                  {glance.nextLineTarget}
                </p>
              ) : null}
              {glance.nextArrival ? (
                <p className="mt-2 text-lg text-[color:var(--quiet)]">
                  Ankunft ca.{" "}
                  <span className="tabular-nums text-[color:var(--ink)]">
                    {glance.nextArrival}
                  </span>
                </p>
              ) : null}
            </>
          ) : glance.alertDetail ? (
            <p className="mt-2 text-lg text-[color:var(--quiet)]">
              {glance.alertDetail}
            </p>
          ) : (
            <p className="mt-2 text-lg text-[color:var(--quiet)]">
              Keine weitere Verbindung bekannt.
            </p>
          )}
        </div>
      ) : (
        <>
          {glance.time ? (
            <p
              className={cn(
                "font-display tabular-nums tracking-tight text-5xl sm:text-6xl landscape-tablet:text-5xl",
              )}
            >
              {isDelay ? <span aria-hidden>🚌 </span> : null}
              {glance.time}
            </p>
          ) : glance.leaveHome ? (
            <p className="font-display text-5xl tabular-nums tracking-tight sm:text-6xl landscape-tablet:text-5xl">
              {glance.leaveHome}
            </p>
          ) : null}

          {isDelay && glance.alertDetail ? (
            <p className="mt-2 text-xl font-medium text-[color:var(--ink)] landscape-tablet:text-2xl">
              {glance.alertDetail}
            </p>
          ) : null}

          {glance.lineTarget ? (
            <p
              className={cn(
                "text-xl font-medium text-[color:var(--ink)] landscape-tablet:text-2xl",
                glance.time || glance.leaveHome ? "mt-4" : undefined,
              )}
            >
              {glance.lineTarget}
            </p>
          ) : null}

          {glance.arrival ? (
            <p className="mt-2 text-lg text-[color:var(--quiet)]">
              Ankunft ca.{" "}
              <span className="tabular-nums text-[color:var(--ink)]">
                {glance.arrival}
              </span>
            </p>
          ) : null}

          {glance.leaveHome && glance.time && glance.leaveHome !== glance.time ? (
            <p className="mt-3 text-base text-[color:var(--quiet)]">
              Los um{" "}
              <span className="tabular-nums text-[color:var(--ink)]">
                {glance.leaveHome}
              </span>
            </p>
          ) : null}

          {glance.isTestData ? (
            <p className="mt-3 text-sm text-[color:var(--quiet)]">
              Testdaten — keine Live-Abfahrt
            </p>
          ) : null}
        </>
      )}
      {glance.hint ? (
        <p className="mt-3 text-sm text-[color:var(--quiet)]">{glance.hint}</p>
      ) : null}
    </Section>
  );
}
