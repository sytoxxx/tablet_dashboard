import type { TravelConnection, TravelLeg } from "@/lib/work/travel-types";
import type { TravelPlan } from "@/lib/work/travel-planner";
import { preparationCopy } from "@/lib/work/travel-planner";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import type { ClarityEmphasis } from "@/components/clarity-block";

type PlanSlice = Pick<
  TravelPlan,
  | "mode"
  | "destinationLabel"
  | "endDestinationLabel"
  | "transitDestinationLabel"
  | "workStart"
  | "workEnd"
  | "arrivalTarget"
  | "arrivalTargetEnd"
  | "leaveHome"
  | "busDeparture"
  | "arrivalAtWork"
  | "arrivalAtDestination"
  | "preparationStart"
  | "status"
  | "message"
  | "isTestData"
  | "travelMinutes"
  | "walkToStopMinutes"
  | "legs"
  | "connections"
  | "alternativeConnection"
>;

function firstTransit(legs: TravelLeg[] | null | undefined): TravelLeg | null {
  if (!legs?.length) return null;
  return legs.find((leg) => leg.type === "TRANSIT") ?? null;
}

/** Plain German: "Bus 1 Richtung Bruck" from existing leg/connection fields only. */
function busLineCopy(
  plan: PlanSlice,
  connection?: TravelConnection | null,
): string | null {
  const legs = connection?.legs ?? plan.legs;
  const transit = firstTransit(legs);
  const line =
    transit?.line?.trim() ||
    connection?.lineSummary?.replace(/^Linie\s+/i, "").trim() ||
    null;
  const direction =
    transit?.direction?.trim() ||
    connection?.direction?.trim() ||
    plan.transitDestinationLabel?.trim() ||
    plan.endDestinationLabel?.trim() ||
    plan.destinationLabel?.trim() ||
    null;
  if (!line && !direction) return null;
  if (line && direction) return `Bus ${line} Richtung ${direction}`;
  if (line) return `Bus ${line}`;
  return direction ? `Richtung ${direction}` : null;
}

function workHoursCopy(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start} – ${end} Uhr`;
  if (start) return `ab ${start} Uhr`;
  return `bis ${end} Uhr`;
}

function HeuteBlock({
  plan,
  workLabel,
  emphasis = "secondary",
}: {
  plan: PlanSlice;
  workLabel?: string | null;
  emphasis?: ClarityEmphasis;
}) {
  const hours = workHoursCopy(plan.workStart, plan.workEnd);
  if (!hours && !workLabel) {
    return (
      <Section title="Heute" emphasis={emphasis}>
        <EmptyState
          title="Heute sind keine Arbeitszeiten eingetragen."
          description="Sobald Schichtzeiten da sind, siehst du sie hier."
        />
      </Section>
    );
  }

  return (
    <Section title="Heute" emphasis={emphasis}>
      <p className="text-lg text-[color:var(--ink)]">Du arbeitest heute</p>
      {hours ? (
        <p className="mt-2 font-display text-4xl tabular-nums tracking-tight sm:text-5xl">
          {hours}
        </p>
      ) : null}
      {workLabel ? (
        <p className="mt-2 text-base text-[color:var(--quiet)]">{workLabel}</p>
      ) : null}
    </Section>
  );
}

function LosfahrenBus({
  plan,
  emphasis = "hero",
}: {
  plan: PlanSlice;
  emphasis?: ClarityEmphasis;
}) {
  const primary = plan.connections?.[0] ?? null;
  const leave = primary?.leaveHome || plan.leaveHome;
  const arrival =
    primary?.arrival || plan.arrivalAtWork || plan.arrivalAtDestination;
  const busLine = busLineCopy(plan, primary);
  const departure = primary?.departure || plan.busDeparture;
  const prep = preparationCopy(plan.preparationStart);

  if (!leave && !departure) {
    return (
      <Section title="Losfahren" emphasis={emphasis}>
        <EmptyState
          title="Du musst heute keinen Bus nehmen."
          description="Es steht keine Verbindung für den Morgen an."
        />
      </Section>
    );
  }

  return (
    <Section title="Losfahren" emphasis={emphasis}>
      {leave ? (
        <>
          <p className="text-lg text-[color:var(--ink)]">
            Du musst um{" "}
            <span className="font-medium tabular-nums">{leave}</span> los
          </p>
          <p className="mt-3 font-display text-5xl tabular-nums tracking-tight sm:text-6xl landscape-tablet:text-6xl">
            {leave}
          </p>
        </>
      ) : null}
      {busLine ? (
        <p className="mt-4 text-xl font-medium text-[color:var(--ink)]">
          {busLine}
        </p>
      ) : departure ? (
        <p className="mt-4 text-xl text-[color:var(--ink)]">
          Bus um <span className="tabular-nums font-medium">{departure}</span>
        </p>
      ) : null}
      {arrival ? (
        <p className="mt-2 text-lg text-[color:var(--quiet)]">
          Ankunft ca. <span className="tabular-nums text-[color:var(--ink)]">{arrival}</span>
        </p>
      ) : null}
      {prep ? (
        <p className="mt-3 text-base text-[color:var(--quiet)]">{prep}</p>
      ) : null}
    </Section>
  );
}

function NextBusBlock({
  plan,
  emphasis = "secondary",
}: {
  plan: PlanSlice;
  emphasis?: ClarityEmphasis;
}) {
  // Primary connection is already in Losfahren — show the next one only.
  const next = plan.connections?.[1] ?? null;
  if (!next) return null;

  const line = busLineCopy(plan, next);
  const time = next.departure || next.leaveHome;

  return (
    <Section title="Nächster Bus" emphasis={emphasis}>
      {time ? (
        <p className="font-display text-4xl tabular-nums tracking-tight sm:text-5xl">
          {time}
        </p>
      ) : null}
      {line ? (
        <p className="mt-3 text-xl font-medium text-[color:var(--ink)]">{line}</p>
      ) : (
        <p className="mt-3 text-xl text-[color:var(--ink)]">Bus</p>
      )}
      {next.arrival ? (
        <p className="mt-2 text-lg text-[color:var(--quiet)]">
          Ankunft ca.{" "}
          <span className="tabular-nums text-[color:var(--ink)]">
            {next.arrival}
          </span>
        </p>
      ) : null}
    </Section>
  );
}

function WalkingLeave({
  plan,
  emphasis = "hero",
}: {
  plan: PlanSlice;
  emphasis?: ClarityEmphasis;
}) {
  const destination =
    plan.endDestinationLabel || plan.destinationLabel || "Schule";
  const walkMinutes = plan.travelMinutes || plan.walkToStopMinutes;
  const prep = preparationCopy(plan.preparationStart);
  const arrival = plan.arrivalAtDestination || plan.arrivalTarget;

  return (
    <Section title="Losfahren" emphasis={emphasis}>
      <p className="text-lg text-[color:var(--ink)]">
        Du musst um{" "}
        <span className="font-medium tabular-nums">{plan.leaveHome}</span> los
      </p>
      <p className="mt-3 font-display text-5xl tabular-nums tracking-tight sm:text-6xl">
        {plan.leaveHome}
      </p>
      <p className="mt-4 text-xl text-[color:var(--ink)]">
        Zu Fuß → {destination}
        {walkMinutes > 0 ? (
          <span className="text-[color:var(--quiet)]">
            {" "}
            · ca. {walkMinutes} Min.
          </span>
        ) : null}
      </p>
      {arrival ? (
        <p className="mt-2 text-lg text-[color:var(--quiet)]">
          Ankunft ca.{" "}
          <span className="tabular-nums text-[color:var(--ink)]">{arrival}</span>
        </p>
      ) : null}
      {prep ? (
        <p className="mt-3 text-base text-[color:var(--quiet)]">{prep}</p>
      ) : null}
    </Section>
  );
}

/**
 * Clarity-first travel for walking (Levi) and bus (Birgit/Heidi).
 * Plain German only — no provider / API jargon.
 */
export function WorkTravelSection({
  plan,
  workLabel,
  leaveEmphasis = "hero",
  workEmphasis = "secondary",
}: {
  plan: PlanSlice | null;
  workLabel?: string | null;
  leaveEmphasis?: ClarityEmphasis;
  workEmphasis?: ClarityEmphasis;
}) {
  if (!plan) return null;

  const isWalking = plan.mode === "walking";

  if (plan.status === "no-connection" || plan.status === "cancelled") {
    return (
      <div className="space-y-5">
        {!isWalking ? (
          <HeuteBlock plan={plan} workLabel={workLabel} emphasis="hero" />
        ) : null}
        {!isWalking ? (
          <Section title="Losfahren" emphasis="secondary">
            <EmptyState
              title="Du musst heute keinen Bus nehmen."
              description="Gerade ist keine passende Verbindung verfügbar."
            />
          </Section>
        ) : (
          <Section title="Losfahren" emphasis="hero">
            <EmptyState
              title="Kein Weg zur Schule geplant."
              description="Sobald Zeiten da sind, siehst du hier wann du los musst."
            />
          </Section>
        )}
      </div>
    );
  }

  if (plan.status !== "on-time" || !plan.leaveHome) {
    if (!isWalking && (plan.workStart || plan.workEnd || workLabel)) {
      return (
        <HeuteBlock plan={plan} workLabel={workLabel} emphasis={workEmphasis} />
      );
    }
    return null;
  }

  if (isWalking) {
    return <WalkingLeave plan={plan} emphasis={leaveEmphasis} />;
  }

  return (
    <div className="space-y-5">
      <HeuteBlock plan={plan} workLabel={workLabel} emphasis={workEmphasis} />
      <LosfahrenBus plan={plan} emphasis={leaveEmphasis} />
      <NextBusBlock plan={plan} emphasis="secondary" />
    </div>
  );
}
