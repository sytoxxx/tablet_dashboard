import type { TravelConnection, TravelLeg } from "@/lib/work/travel-types";
import type { TravelPlan } from "@/lib/work/travel-planner";
import {
  arrivalWindowCopy,
  preparationCopy,
} from "@/lib/work/travel-planner";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";

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

function legLine(leg: TravelLeg): string {
  if (leg.type === "WALK") {
    const dur = leg.durationMinutes != null ? ` (${leg.durationMinutes} Min.)` : "";
    return `Zu Fuß${dur}: ${leg.from ?? "?"} → ${leg.to ?? "?"}`;
  }
  if (leg.type === "TRANSFER") {
    return "Umstieg";
  }
  const delay =
    leg.delayMinutes && leg.delayMinutes > 0
      ? ` · +${leg.delayMinutes} Min.`
      : "";
  const rt = leg.isRealtime ? " · Live" : "";
  return `Linie ${leg.line ?? "?"} ${leg.direction ? `→ ${leg.direction}` : ""}${rt}${delay}`;
}

function ConnectionCard({
  connection,
  index,
  endLabel,
}: {
  connection: TravelConnection;
  index: number;
  endLabel?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-[color:var(--bg)] px-4 py-3">
      <p className="text-sm text-[color:var(--quiet)]">
        Verbindung {index + 1}
        {connection.isDirect ? " · direkt" : ` · ${connection.transfers} Umstieg`}
        {connection.realtime ? " · Live" : ""}
      </p>
      <p className="mt-1 font-display text-3xl tabular-nums tracking-tight">
        {connection.departure}
        {connection.arrival ? ` → ${connection.arrival}` : ""}
      </p>
      {connection.leaveHome ? (
        <p className="mt-1 text-base text-[color:var(--ink)]">
          Losgehen {connection.leaveHome}
        </p>
      ) : null}
      {endLabel ? (
        <p className="mt-1 text-sm text-[color:var(--quiet)]">Ziel: {endLabel}</p>
      ) : null}
      <ul className="mt-2 space-y-1 text-sm text-[color:var(--ink)]">
        {connection.legs.map((leg, i) => (
          <li key={`${leg.type}-${i}`}>{legLine(leg)}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Shared morning travel result for walking (Levi) and bus (Birgit/Heidi).
 * No provider / API jargon.
 */
export function WorkTravelSection({
  plan,
  workLabel,
}: {
  plan: PlanSlice | null;
  workLabel?: string | null;
}) {
  if (!plan) return null;

  const isWalking = plan.mode === "walking";
  const arrival =
    arrivalWindowCopy(
      plan.arrivalTarget ?? plan.workStart,
      plan.arrivalTargetEnd,
    ) ?? null;
  const destination =
    plan.endDestinationLabel ||
    plan.destinationLabel ||
    (isWalking ? "Schule" : "Arbeit");

  if (plan.status === "no-connection" || plan.status === "cancelled") {
    return (
      <div className="space-y-5">
        {(arrival || plan.workStart || plan.workEnd) && (
          <Section title={isWalking ? destination : "Arbeit heute"}>
            {isWalking ? (
              <>
                {arrival ? (
                  <p className="mt-1 text-lg text-[color:var(--ink)]">
                    Ankunft: {arrival}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="font-display text-3xl tabular-nums tracking-tight sm:text-4xl">
                {plan.workStart}
                {plan.workEnd ? `–${plan.workEnd}` : null}
              </p>
            )}
            {workLabel ? (
              <p className="mt-2 text-base text-[color:var(--quiet)]">{workLabel}</p>
            ) : null}
          </Section>
        )}
        {!isWalking ? (
          <Section title="Dein Bus">
            <EmptyState
              title="Kein passender Bus"
              description="Bitte prüfe die nächste Verbindung."
            />
          </Section>
        ) : null}
      </div>
    );
  }

  if (plan.status !== "on-time" || !plan.leaveHome) {
    return null;
  }

  const prep = preparationCopy(plan.preparationStart);
  const walkMinutes = plan.travelMinutes || plan.walkToStopMinutes;
  const connections = plan.connections?.length
    ? plan.connections
    : null;

  if (isWalking) {
    return (
      <Section title={destination}>
        {arrival ? (
          <p className="text-lg text-[color:var(--ink)]">Ankunft: {arrival}</p>
        ) : null}
        {walkMinutes > 0 ? (
          <p className="mt-2 text-lg text-[color:var(--ink)]">
            Zu Fuß: ca. {walkMinutes} Min.
          </p>
        ) : null}
        <p className="mt-4 font-display text-4xl tabular-nums tracking-tight landscape-tablet:text-5xl">
          {plan.leaveHome}
        </p>
        <p className="mt-1 text-base text-[color:var(--quiet)]">Losgehen</p>
        {prep ? (
          <p className="mt-3 text-base text-[color:var(--quiet)]">{prep}</p>
        ) : null}
        <p className="mt-3 text-base text-[color:var(--ink)]">{plan.message}</p>
      </Section>
    );
  }

  return (
    <div className="space-y-5">
      {(plan.workStart || plan.workEnd) && (
        <Section title="Arbeit heute">
          <p className="font-display text-3xl tabular-nums tracking-tight sm:text-4xl">
            {plan.workStart}
            {plan.workEnd ? `–${plan.workEnd}` : null}
          </p>
          {workLabel ? (
            <p className="mt-2 text-base text-[color:var(--quiet)]">{workLabel}</p>
          ) : null}
          <p className="mt-2 text-base text-[color:var(--quiet)]">
            Ziel: {destination}
            {plan.transitDestinationLabel &&
            plan.transitDestinationLabel !== destination
              ? ` · Halt ${plan.transitDestinationLabel}`
              : null}
          </p>
        </Section>
      )}

      {connections && connections.length > 0 ? (
        <Section title={connections.length > 1 ? "Nächste Verbindungen" : "Deine Verbindung"}>
          <div className="space-y-3">
            {connections.map((c, i) => (
              <ConnectionCard
                key={`${c.departure}-${c.arrival}-${i}`}
                connection={c}
                index={i}
                endLabel={destination}
              />
            ))}
          </div>
          {plan.alternativeConnection &&
          !connections.some(
            (c) =>
              c.departure === plan.alternativeConnection?.departure &&
              c.arrival === plan.alternativeConnection?.arrival,
          ) ? (
            <div className="mt-3">
              <p className="mb-2 text-sm text-[color:var(--quiet)]">Alternative</p>
              <ConnectionCard
                connection={plan.alternativeConnection}
                index={0}
                endLabel={destination}
              />
            </div>
          ) : null}
          {prep ? (
            <p className="mt-3 text-base text-[color:var(--quiet)]">{prep}</p>
          ) : null}
          <p className="mt-2 text-base text-[color:var(--ink)]">{plan.message}</p>
        </Section>
      ) : (
        <Section title="Dein Bus">
          <p className="font-display text-4xl tabular-nums tracking-tight landscape-tablet:text-5xl">
            {plan.busDeparture}
          </p>
          {(plan.arrivalAtWork || plan.arrivalAtDestination) && (
            <p className="mt-3 text-lg text-[color:var(--ink)]">
              Ankunft {destination}{" "}
              {plan.arrivalAtWork || plan.arrivalAtDestination}
            </p>
          )}
          {plan.leaveHome ? (
            <p className="mt-2 text-lg text-[color:var(--ink)]">
              Losgehen {plan.leaveHome}
            </p>
          ) : null}
          {plan.legs && plan.legs.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-[color:var(--ink)]">
              {plan.legs.map((leg, i) => (
                <li key={`${leg.type}-${i}`}>{legLine(leg)}</li>
              ))}
            </ul>
          ) : null}
          {prep ? (
            <p className="mt-2 text-base text-[color:var(--quiet)]">{prep}</p>
          ) : null}
          <p className="mt-3 text-base text-[color:var(--ink)]">{plan.message}</p>
        </Section>
      )}
    </div>
  );
}
