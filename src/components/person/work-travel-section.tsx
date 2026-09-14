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
>;

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
        </Section>
      )}

      <Section title="Dein Bus">
        <p className="font-display text-4xl tabular-nums tracking-tight landscape-tablet:text-5xl">
          {plan.busDeparture}
        </p>
        {(plan.arrivalAtWork || plan.arrivalAtDestination) && (
          <p className="mt-3 text-lg text-[color:var(--ink)]">
            Ankunft Arbeit {plan.arrivalAtWork || plan.arrivalAtDestination}
          </p>
        )}
        {plan.leaveHome ? (
          <p className="mt-2 text-lg text-[color:var(--ink)]">
            Losgehen {plan.leaveHome}
          </p>
        ) : null}
        {prep ? (
          <p className="mt-2 text-base text-[color:var(--quiet)]">{prep}</p>
        ) : null}
        <p className="mt-3 text-base text-[color:var(--ink)]">{plan.message}</p>
      </Section>
    </div>
  );
}
