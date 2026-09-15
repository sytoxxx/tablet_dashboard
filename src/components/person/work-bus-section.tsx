import type { WorkBusGlance } from "@/lib/morning/work-bus-glance";
import { Section } from "@/components/section";
import type { ClarityEmphasis } from "@/components/clarity-block";
import { cn } from "@/lib/utils";

/**
 * Birgit/Heidi commute block — sits directly under Arbeitszeit.
 * Alerts only when resolveWorkBusGlance found real delay/cancel/deviation.
 */
export function WorkBusSection({
  glance,
  emphasis = "hero",
}: {
  glance: WorkBusGlance;
  emphasis?: ClarityEmphasis;
}) {
  if (!glance.visible) return null;

  const isAlert =
    glance.kind === "cancelled" || glance.kind === "deviation";
  const isDelay = glance.kind === "delay";

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
    </Section>
  );
}
