import type { WorkTravelPlan } from "@/lib/work/travel-planner";
import { preparationCopy } from "@/lib/work/travel-planner";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";

/**
 * Simple Birgit/Heidi work-travel result — no provider/API jargon.
 */
export function WorkTravelSection({
  plan,
  workLabel,
}: {
  plan: Pick<
    WorkTravelPlan,
    | "workStart"
    | "workEnd"
    | "leaveHome"
    | "busDeparture"
    | "arrivalAtWork"
    | "preparationStart"
    | "status"
    | "message"
    | "isTestData"
  > | null;
  workLabel?: string | null;
}) {
  if (!plan) return null;

  if (plan.status === "no-connection" || plan.status === "cancelled") {
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
          <EmptyState
            title="Kein passender Bus"
            description="Bitte prüfe die nächste Verbindung."
          />
        </Section>
      </div>
    );
  }

  if (plan.status !== "on-time" || !plan.busDeparture) {
    return null;
  }

  const prep = preparationCopy(plan.preparationStart);

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
        {plan.arrivalAtWork ? (
          <p className="mt-3 text-lg text-[color:var(--ink)]">
            Ankunft Arbeit {plan.arrivalAtWork}
          </p>
        ) : null}
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
