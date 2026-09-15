import type { CoffeeBean, CoffeeBrew } from "@/lib/coffee/types";
import { computePeriodStats } from "@/lib/coffee/stats";

export type CoffeeRecommendation = {
  id: string;
  title: string;
  detail: string;
};

/**
 * Recommendations derived only from saved brews / beans.
 * Returns empty array when there is nothing real to say.
 */
export function buildRecommendations(
  beans: CoffeeBean[],
  brews: CoffeeBrew[],
): CoffeeRecommendation[] {
  if (!brews.length && !beans.length) return [];

  const out: CoffeeRecommendation[] = [];
  const stats = computePeriodStats(brews);

  if (stats.mostDrunkBeanId) {
    const bean = beans.find((b) => b.id === stats.mostDrunkBeanId);
    if (bean) {
      out.push({
        id: "most-drunk-bean",
        title: `${bean.name} kommt oft vor`,
        detail: `In ${stats.byBean[bean.id] ?? 0} gespeicherten Brühungen — nur aus deinen Daten.`,
      });
    }
  }

  const rated = brews.filter((b) => typeof b.rating === "number");
  if (rated.length) {
    const best = [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
    if (best && (best.rating ?? 0) >= 4) {
      const bean = beans.find((b) => b.id === best.beanId);
      const method = best.method;
      out.push({
        id: "high-rated",
        title: bean
          ? `${bean.name} hat dir gut geschmeckt`
          : "Eine Brühung hat gut abgeschnitten",
        detail: `Bewertung ${best.rating}/5 · Methode ${method} · ${formatWhen(best.brewedAt)}.`,
      });
    }
  }

  const lowStock = beans.filter(
    (b) => typeof b.remainingGrams === "number" && b.remainingGrams > 0 && b.remainingGrams < 100,
  );
  for (const bean of lowStock.slice(0, 2)) {
    out.push({
      id: `low-${bean.id}`,
      title: `${bean.name} wird knapp`,
      detail: `Noch ca. ${bean.remainingGrams} g hinterlegt.`,
    });
  }

  if (stats.avgDurationSeconds != null && stats.total >= 3) {
    out.push({
      id: "avg-time",
      title: "Deine durchschnittliche Brühzeit",
      detail: `${formatMmSs(stats.avgDurationSeconds)} über ${stats.total} gespeicherte Brühungen.`,
    });
  }

  return out;
}

function formatWhen(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(t));
}

function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
