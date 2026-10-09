"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { clearUntis, loadUntis, saveUntis, type UntisStored } from "@/lib/untis/store";
import { ageLabel, eventsForDate } from "@/lib/untis/select";
import { buildSuccess } from "@/lib/untis/snapshot";
import { toIsoDate } from "@/lib/day/tomorrow";
import type { UntisEvent } from "@/lib/untis/ical";

type TestResult =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; total: number; today: UntisEvent[]; warnings: string[]; fetchedAt: number }
  | { kind: "error"; message: string };

const SCHOOL_REQUEST = `Guten Tag,

ich bin Schüler der Klasse 2AHETS und möchte meinen WebUntis-Stundenplan in einer privaten Familien-App anzeigen.
In meinem WebUntis-Konto gibt es unter „Mein Stundenplan" kein „iCal-Abo verwalten".

Könnte der WebUntis-Administrator bitte den iCal-Kalenderabruf („Kalender publizieren") für Schüler aktivieren?
Es wird nur mein eigener Stundenplan abgerufen, kein Passwort wird weitergegeben.

Vielen Dank!`;

const STEPS = [
  ["1", "WebUntis öffnen", "Im Browser auf dem Handy oder Computer bei WebUntis anmelden (mit Leventes Schulzugang)."],
  ["2", "„Mein Stundenplan“", "Den eigenen Stundenplan öffnen, unten rechts auf die drei Punkte tippen."],
  ["3", "„iCal-Abo verwalten“", "Dort den Kalender veröffentlichen und den angezeigten Link kopieren. Er beginnt mit https:// oder webcal://."],
  ["4", "Hier einfügen", "Den Link unten einfügen und „Verbindung testen“ tippen."],
] as const;

export default function WebUntisSettingsPage() {
  const [stored, setStored] = useState<UntisStored | null>(null);
  const [link, setLink] = useState("");
  const [test, setTest] = useState<TestResult>({ kind: "idle" });
  const [now, setNow] = useState(() => new Date());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const read = () => {
      setStored(loadUntis());
      setNow(new Date());
    };
    read();
  }, []);

  const connected = Boolean(stored?.url);

  const runTest = async () => {
    const url = link.trim();
    if (!url) return;
    setTest({ kind: "testing" });
    try {
      const res = await fetch("/api/untis/timetable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
        cache: "no-store",
      });
      const json = (await res.json()) as
        | { ok: true; fetchedAt: number; events: UntisEvent[]; warnings: string[] }
        | { ok: false; message: string };
      if (!json.ok) {
        setTest({ kind: "error", message: json.message });
        return;
      }
      const today = toIsoDate(new Date());
      // Only a link that really delivered a calendar is saved.
      const next: UntisStored = { url, lastSuccess: buildSuccess(json.events, json.warnings, json.fetchedAt, today) };
      saveUntis(next);
      setStored(next);
      setLink("");
      setNow(new Date());
      setTest({
        kind: "ok",
        total: json.events.length,
        today: eventsForDate(json.events, today),
        warnings: json.warnings,
        fetchedAt: json.fetchedAt,
      });
    } catch {
      setTest({ kind: "error", message: "Keine Verbindung zu Coffee Morning. Internet prüfen und noch einmal versuchen." });
    }
  };

  return (
    <AdminShell title="WebUntis verbinden" subtitle="Leventes echter Stundenplan — ohne Passwort, über den privaten Kalender-Link von WebUntis.">
      <section className="space-y-4 rounded-[1.5rem] bg-[color:var(--surface)] p-5">
        <h2 className="font-display text-2xl tracking-tight">So kommst du an den Link</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map(([n, title, body]) => (
            <li key={n} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--ink)] font-semibold text-[color:var(--surface)]">{n}</span>
              <span className="text-base leading-snug">
                <span className="font-medium">{title}.</span> <span className="text-[color:var(--quiet)]">{body}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-[color:var(--quiet)]">
          Der Link ist wie ein Schlüssel: Wer ihn kennt, sieht den Stundenplan. Bitte nicht weitergeben.
        </p>
        <div className="space-y-3 rounded-2xl bg-amber-50 p-4 text-amber-950" data-testid="untis-no-ical">
          <p className="text-base font-medium">Siehst du „iCal-Abo“ nicht?</p>
          <p className="text-base">
            Dann hat die Schule diese Funktion für Schüler nicht freigeschaltet (laut WebUntis-Handbuch muss sie dafür
            extra aktiviert werden). Eine öffentliche Stundenplan-Seite ohne Anmeldung gibt es bei der HTL Kapfenberg
            ebenfalls nicht. Der nächste Schritt: die Schule bitten, den iCal-Abruf für Schüler zu aktivieren.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-12 gap-2 rounded-xl bg-white/70 px-5"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(SCHOOL_REQUEST);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 3500);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "✓ Kopiert" : "Nachricht an die Schule kopieren"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">Status</h2>
        {connected && stored?.lastSuccess ? (
          <p className="rounded-2xl bg-[color:var(--surface)] px-5 py-4 text-lg" data-testid="untis-connected">
            ✓ Verbunden. Letzte erfolgreiche Aktualisierung: {ageLabel(stored.lastSuccess.fetchedAt, now)}. Coffee Morning
            aktualisiert den Plan alle 15 Minuten, solange das Dashboard offen ist.
          </p>
        ) : connected ? (
          <p className="rounded-2xl bg-amber-50 px-5 py-4 text-lg text-amber-950">Link gespeichert, aber noch kein erfolgreicher Abruf.</p>
        ) : (
          <p className="rounded-2xl bg-[color:var(--surface)] px-5 py-4 text-lg text-[color:var(--quiet)]">Noch nicht verbunden.</p>
        )}
      </section>

      <section className="space-y-3">
        <label htmlFor="untis-link" className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
          {connected ? "Neuen Link einfügen" : "iCal-Link aus WebUntis"}
        </label>
        <textarea
          id="untis-link"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setTest({ kind: "idle" });
          }}
          rows={3}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="https://….webuntis.com/WebUntis/…"
          className="w-full resize-y rounded-[1.5rem] bg-[color:var(--surface)] p-4 text-base outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" size="lg" className="h-16 rounded-2xl px-8 text-lg active:scale-[0.97]" disabled={!link.trim() || test.kind === "testing"} onClick={runTest}>
            {test.kind === "testing" ? "Teste …" : "Verbindung testen"}
          </Button>
          {connected ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-16 rounded-2xl px-6"
              onClick={() => {
                clearUntis();
                setStored(loadUntis());
                setTest({ kind: "idle" });
              }}
            >
              Verbindung trennen
            </Button>
          ) : null}
        </div>

        {test.kind === "error" ? (
          <p role="alert" className="rounded-2xl bg-red-50 px-5 py-4 text-lg text-red-800" data-testid="untis-error">
            {test.message} <span className="block text-base">Es wurde nichts gespeichert.</span>
          </p>
        ) : null}
        {test.kind === "ok" ? (
          <div role="status" className="space-y-2 rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-950" data-testid="untis-ok">
            <p className="text-lg font-medium">✓ Verbunden — {test.total} Einträge von WebUntis erhalten und gespeichert.</p>
            {test.today.length > 0 ? (
              <p className="text-base">
                Heute: {test.today.map((e) => `${e.start} ${e.subject}${e.cancelled ? " (entfällt)" : ""}`).join(" · ")}
              </p>
            ) : (
              <p className="text-base">Für heute liefert WebUntis keine Stunden.</p>
            )}
            {test.warnings.map((w) => (
              <p key={w} className="text-sm">{w}</p>
            ))}
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
