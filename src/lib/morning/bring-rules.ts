/**
 * Rule-based “Mitnehmen” from today’s subjects/blocks.
 * Explicit lesson/work `bringItems` always win; rules fill gaps.
 * No AI — simple keyword map with case-insensitive dedupe.
 */

const SUBJECT_RULES: Array<{ match: RegExp; items: string[] }> = [
  { match: /\b(mathematik|mathe)\b/i, items: ["Mathematik-Unterlagen"] },
  { match: /\b(sport|turnen|bewegung)\b/i, items: ["Sportsachen"] },
  { match: /\b(informatik|programmieren)\b/i, items: ["Laptop"] },
  { match: /\b(physik)\b/i, items: ["Physik-Unterlagen"] },
  { match: /\b(chemie)\b/i, items: ["Schutzbrille"] },
  { match: /\b(kunst|zeichnen)\b/i, items: ["Skizzenbuch"] },
  { match: /\b(deutsch)\b/i, items: ["Deutsch-Unterlagen"] },
  { match: /\b(englisch)\b/i, items: ["Englisch-Unterlagen"] },
  { match: /\b(musik)\b/i, items: ["Noten"] },
];

/** Synonyms collapsed so “Sportzeug” and “Sportsachen” don’t both appear. */
const CANONICAL: Record<string, string> = {
  sportzeug: "Sportsachen",
  sportsachen: "Sportsachen",
  "mathematik-unterlagen": "Mathematik-Unterlagen",
  "mathe-unterlagen": "Mathematik-Unterlagen",
  taschenrechner: "Taschenrechner",
  laptop: "Laptop",
  schulsachen: "Schulsachen",
  schultasche: "Schulsachen",
};

function normalizeKey(item: string): string {
  return item.trim().toLowerCase().replace(/\s+/g, " ");
}

function canonicalize(item: string): string {
  const key = normalizeKey(item);
  return CANONICAL[key] ?? item.trim();
}

/** Items implied by a subject or block title. */
export function itemsFromSubjectTitle(title: string): string[] {
  const out: string[] = [];
  for (const rule of SUBJECT_RULES) {
    if (rule.match.test(title)) {
      out.push(...rule.items);
    }
  }
  return out;
}

/**
 * Deduplicate bring list (case-insensitive, synonym-aware).
 * First occurrence wins after canonicalize.
 */
export function dedupeBringItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    const item = canonicalize(raw);
    if (!item) continue;
    const key = normalizeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function applySubjectBringRules(
  titles: string[],
  hasSchoolDay: boolean,
): string[] {
  const collected: string[] = [];
  for (const title of titles) {
    collected.push(...itemsFromSubjectTitle(title));
  }
  if (hasSchoolDay) {
    collected.push("Schulsachen");
  }
  return dedupeBringItems(collected);
}
