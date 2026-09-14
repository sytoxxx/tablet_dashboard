"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import type { PersonId } from "@/lib/types";
import {
  emptyImportDraft,
  type WardrobeImportDraft,
  type WardrobeItem,
} from "@/lib/wardrobe/model";
import {
  WARDROBE_BRIGHTNESS_LABELS,
  WARDROBE_COLOR_LABELS,
  WARDROBE_COLORS,
  WARDROBE_GARMENT_KINDS,
  WARDROBE_GARMENT_LABELS,
  type WardrobeBrightness,
  type WardrobeColor,
  type WardrobeGarmentKind,
} from "@/lib/wardrobe/taxonomy";
import {
  analyzeGarmentImage,
  sanitizeWardrobeErrorMessage,
  suggestionShellAfterPhoto,
} from "@/lib/wardrobe/analyze";
import {
  applyDraftEdits,
  confirmSaveWardrobeItem,
} from "@/lib/wardrobe/confirm";
import { countActiveBySlot } from "@/lib/wardrobe/store";
import { useWardrobe } from "@/hooks/use-wardrobe";
import { Button } from "@/components/ui/button";
import { AppNav } from "@/components/shared/app-nav";

type Step = "list" | "choose" | "review";

export function WardrobeScreen({
  personId,
  personName,
}: {
  personId: PersonId;
  personName: string;
}) {
  const { catalog, hydrated, replaceCatalog } = useWardrobe(personId);
  const [step, setStep] = useState<Step>("list");
  const [draft, setDraft] = useState<WardrobeImportDraft | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => countActiveBySlot(catalog), [catalog]);
  const tops = catalog.items.filter((i) => i.active && i.slot === "top");
  const bottoms = catalog.items.filter((i) => i.active && i.slot === "bottom");
  const shoes = catalog.items.filter((i) => i.active && i.slot === "shoes");
  const other = catalog.items.filter(
    (i) =>
      i.active && i.slot !== "top" && i.slot !== "bottom" && i.slot !== "shoes",
  );

  function resetImport() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDraft(null);
    setNote(null);
    setError(null);
    setStep("list");
    if (fileRef.current) fileRef.current.value = "";
  }

  function startManual() {
    setDraft(emptyImportDraft(personId, false));
    setNote("Manuell erfassen — bitte Kategorie und Farbe setzen.");
    setError(null);
    setStep("review");
  }

  function onPhotoSelected(file: File | null) {
    if (!file) return;
    setError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    startTransition(async () => {
      try {
        const analyzed = await analyzeGarmentImage({
          imageMimeType: file.type,
          imageByteLength: file.size,
        });
        if (analyzed.ok) {
          setDraft({
            ...emptyImportDraft(personId, true),
            ...analyzed.draft,
            personId,
            hasPhoto: true,
          });
          setNote(analyzed.note);
        } else {
          const shell = suggestionShellAfterPhoto();
          setDraft({
            ...emptyImportDraft(personId, true),
            ...shell.draft,
            personId,
            hasPhoto: true,
          });
          setNote(analyzed.note || shell.note);
        }
        setStep("review");
      } catch (e) {
        const message = sanitizeWardrobeErrorMessage(
          e instanceof Error ? e.message : "Analyse fehlgeschlagen",
        );
        setError(message);
        const shell = suggestionShellAfterPhoto();
        setDraft({
          ...emptyImportDraft(personId, true),
          ...shell.draft,
          personId,
          hasPhoto: true,
        });
        setNote(shell.note);
        setStep("review");
      }
    });
  }

  function saveDraft() {
    if (!draft) return;
    const result = confirmSaveWardrobeItem({ draft, catalog });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    replaceCatalog(result.catalog);
    resetImport();
  }

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-lg px-5 py-6">
        <AppNav
          backHref={`/person/${personId}`}
          backLabel={personName}
          showSettings={false}
        />
        <p className="mt-8 text-lg text-[color:var(--quiet)]">
          Lade Kleiderschrank…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-5 px-5 py-5 sm:max-w-2xl sm:px-8">
      <AppNav
        backHref={`/person/${personId}`}
        backLabel={personName}
        showSettings={false}
      />

      <header className="space-y-1">
        <p className="text-sm tracking-[0.14em] text-[color:var(--quiet)] uppercase">
          {personName}
        </p>
        <h1 className="font-display text-3xl tracking-tight text-[color:var(--ink)]">
          👕 Mein Kleiderschrank
        </h1>
      </header>

      {step === "list" ? (
        <>
          <Button
            size="lg"
            className="h-14 rounded-2xl text-lg"
            onClick={() => setStep("choose")}
          >
            + Kleidungsstück
          </Button>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Oberteile" value={counts.top ?? tops.length} />
            <Stat label="Hosen" value={counts.bottom ?? bottoms.length} />
            <Stat label="Schuhe" value={counts.shoes ?? shoes.length} />
          </div>

          <WardrobeGroup title="Oberteile" items={tops} />
          <WardrobeGroup title="Hosen" items={bottoms} />
          <WardrobeGroup title="Schuhe" items={shoes} />
          {other.length > 0 ? (
            <WardrobeGroup title="Sonstiges" items={other} />
          ) : null}

          {catalog.items.length === 0 ? (
            <p className="text-base text-[color:var(--quiet)]">
              Noch leer — fotografiere ein Kleidungsstück oder trage es manuell
              ein. Nichts wird ohne deine Bestätigung gespeichert.
            </p>
          ) : null}
        </>
      ) : null}

      {step === "choose" ? (
        <section className="space-y-4">
          <h2 className="text-xl font-medium text-[color:var(--ink)]">
            Hinzufügen
          </h2>
          <p className="text-base text-[color:var(--quiet)]">
            Die Kamera öffnet sich nur, wenn du ein Foto wählst.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPhotoSelected(e.target.files?.[0] ?? null)}
          />
          <Button
            size="lg"
            className="h-14 w-full rounded-2xl text-lg"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            📷 Foto aufnehmen / wählen
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-14 w-full rounded-2xl text-lg"
            onClick={startManual}
          >
            Manuell eintragen
          </Button>
          <Button variant="ghost" className="w-full" onClick={resetImport}>
            Abbrechen
          </Button>
        </section>
      ) : null}

      {step === "review" && draft ? (
        <section className="space-y-4">
          <h2 className="text-xl font-medium text-[color:var(--ink)]">
            Vorschlag prüfen
          </h2>
          {note ? (
            <p className="text-base text-[color:var(--quiet)]">{note}</p>
          ) : null}
          {previewUrl ? (
            // Session-only preview — not persisted.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Vorschau Kleidungsstück"
              className="max-h-56 w-full rounded-2xl object-cover"
            />
          ) : null}
          {error ? <p className="text-base text-red-700">{error}</p> : null}

          <Field label="Name">
            <input
              className="h-12 w-full rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 text-lg"
              value={draft.name}
              onChange={(e) =>
                setDraft(applyDraftEdits(draft, { name: e.target.value }))
              }
              placeholder="z. B. Rotes HTL-T-Shirt"
            />
          </Field>

          <Field label="Kategorie">
            <select
              className="h-12 w-full rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 text-lg"
              value={draft.garmentKind}
              onChange={(e) =>
                setDraft(
                  applyDraftEdits(draft, {
                    garmentKind: e.target.value as WardrobeGarmentKind,
                  }),
                )
              }
            >
              {WARDROBE_GARMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {WARDROBE_GARMENT_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Farbe">
            <select
              className="h-12 w-full rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 text-lg"
              value={draft.color}
              onChange={(e) =>
                setDraft(
                  applyDraftEdits(draft, {
                    color: e.target.value as WardrobeColor,
                  }),
                )
              }
            >
              {WARDROBE_COLORS.map((c) => (
                <option key={c} value={c}>
                  {WARDROBE_COLOR_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Helligkeit">
            <select
              className="h-12 w-full rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 text-lg"
              value={draft.brightness}
              onChange={(e) =>
                setDraft(
                  applyDraftEdits(draft, {
                    brightness: e.target.value as WardrobeBrightness,
                  }),
                )
              }
            >
              {(
                Object.keys(WARDROBE_BRIGHTNESS_LABELS) as WardrobeBrightness[]
              ).map((b) => (
                <option key={b} value={b}>
                  {WARDROBE_BRIGHTNESS_LABELS[b]}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-3 text-lg text-[color:var(--ink)]">
            <input
              type="checkbox"
              className="size-5"
              checked={draft.tags.includes("htl")}
              onChange={(e) => {
                const tags = e.target.checked
                  ? Array.from(new Set([...draft.tags, "htl"]))
                  : draft.tags.filter((t) => t !== "htl");
                setDraft(applyDraftEdits(draft, { tags }));
              }}
            />
            HTL / Werkstatt
          </label>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              size="lg"
              className="h-14 flex-1 rounded-2xl text-lg"
              onClick={saveDraft}
            >
              ✓ Speichern
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-14 flex-1 rounded-2xl text-lg"
              onClick={resetImport}
            >
              Abbrechen
            </Button>
          </div>
          <p className="text-sm text-[color:var(--quiet)]">
            Speichern legt das Stück erst jetzt an. Das Foto bleibt nur in
            dieser Sitzung und wird nicht dauerhaft gespeichert.
          </p>
        </section>
      ) : null}

      <p className="mt-auto pt-6 text-center text-sm text-[color:var(--quiet)]">
        <Link
          href={`/person/${personId}`}
          className="underline-offset-2 hover:underline"
        >
          Zurück zum Morgen
        </Link>
      </p>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-[color:var(--quiet)]">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[color:var(--surface)] px-3 py-4 text-center">
      <p className="font-display text-3xl text-[color:var(--ink)]">{value}</p>
      <p className="mt-1 text-sm text-[color:var(--quiet)]">{label}</p>
    </div>
  );
}

function WardrobeGroup({
  title,
  items,
}: {
  title: string;
  items: WardrobeItem[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-lg text-[color:var(--ink)]"
          >
            <span className="font-medium">{item.name}</span>
            <span className="mt-0.5 block text-sm text-[color:var(--quiet)]">
              {WARDROBE_GARMENT_LABELS[item.garmentKind]} ·{" "}
              {WARDROBE_COLOR_LABELS[item.color]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
