import type { BusUpcomingEntry, WorkBusGlance } from "@/lib/morning/work-bus-glance";
import { Section } from "@/components/section";
import type { ClarityEmphasis } from "@/components/clarity-block";
import { cn } from "@/lib/utils";

function minutesUntilLabel(time: string, now: Date): string {
  const [h, m] = time.split(":").map(Number);
  if (h === undefined || m === undefined) return "";
  const target = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const diff = target - nowMinutes;
  if (diff <= 0) return "jetzt";
  if (diff === 1) return "in 1 Min.";
  return `in ${diff} Min.`;
}

/** One row of the "next 3 buses" list — every real fact shown, nothing invented. */
function UpcomingBusRow({ entry, now }: { entry: BusUpcomingEntry; now: Date }) {
  const cancelled = entry.cancelled === true || entry.status === "CANCELLED";
  const delay =
    !cancelled && typeof entry.delayMinutes === "number" && entry.delayMinutes > 0
      ? entry.delayMinutes
      : null;

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-4",
        cancelled ? "bg-[color:var(--surface)]/60" : "bg-[color:var(--surface)]",
      )}
    >
      <div className="flex min-w-0 items-baseline gap-3">
        <p
          className={cn(
            "font-display text-2xl tabular-nums tracking-tight sm:text-3xl",
            cancelled && "text-[color:var(--quiet)] line-through decoration-1",
          )}
        >
          {entry.time}
        </p>
        <p className="min-w-0 truncate text-sm font-medium text-[color:var(--ink)] sm:text-base">
          {entry.line && entry.line !== "?" ? `Linie ${entry.line}` : null}
          {entry.line && entry.line !== "?" && entry.destination ? " → " : null}
          {entry.destination || null}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {cancelled ? (
          <p className="text-sm font-medium text-[color:var(--destructive)]">⚠️ Fällt aus</p>
        ) : delay ? (
          <p className="text-sm font-medium text-[color:var(--destructive)]">+{delay} Min.</p>
        ) : (
          <p className="text-sm text-[color:var(--quiet)]">{minutesUntilLabel(entry.time, now)}</p>
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
  now,
}: {
  glance: WorkBusGlance;
  emphasis?: ClarityEmphasis;
  /** When provided (Heidi), renders up to 3 real upcoming departures instead of just one. */
  upcomingList?: BusUpcomingEntry[];
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
          <p className="text-lg text-[color:var(--quiet)]">
            {glance.alertDetail?.trim() || "Keine passende Verbindung gefunden."}
          </p>
        )}
        {glance.isTestData ? (
          <p className="mt-3 text-sm text-[color:var(--quiet)]">
            Fahrplan-Testdaten — keine Live-Abfahrt
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

  return (
    <Section title={glance.title} emphasis={isAlert ? "hero" : emphasis}>
      {isAlert && glance.alertTitle ? (
        <p className="text-xl font-medium text-[color:var(--ink)] sm:text-2xl">
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
              <p className="mt-1 font-display text-5xl tabular-nums tracking-tight sm:text-6xl landscape-tablet:text-4xl">
                {glance.nextTime}
              </p>
              {glance.nextLineTarget ? (
                <p className="mt-3 text-xl font-medium text-[color:var(--ink)]">
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
                "font-display tabular-nums tracking-tight text-5xl sm:text-6xl landscape-tablet:text-4xl",
              )}
            >
              {isDelay ? <span aria-hidden>🚌 </span> : null}
              {glance.time}
            </p>
          ) : glance.leaveHome ? (
            <p className="font-display text-5xl tabular-nums tracking-tight sm:text-6xl landscape-tablet:text-4xl">
              {glance.leaveHome}
            </p>
          ) : null}

          {isDelay && glance.alertDetail ? (
            <p className="mt-2 text-xl font-medium text-[color:var(--ink)]">
              {glance.alertDetail}
            </p>
          ) : null}

          {glance.lineTarget ? (
            <p
              className={cn(
                "text-xl font-medium text-[color:var(--ink)]",
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
              Fahrplan-Testdaten — keine Live-Abfahrt
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
