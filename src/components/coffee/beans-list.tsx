"use client";

import { useState } from "react";
import Link from "next/link";
import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import type { CoffeeBean } from "@/lib/coffee/types";

export function BeansList() {
  const { ready, data, setActiveBeanId, removeBean, updateBean } = useCoffeeCommand();

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="h-14 rounded-2xl px-6 active:scale-[0.97]">
          <Link href="/kaffee/bohnen/scannen">Bohne scannen / hinzufügen</Link>
        </Button>
      </div>

      {data.beans.length === 0 ? (
        <EmptyState
          title="Noch keine Bohnen"
          description="Scanne eine Tüte oder füge eine Bohne manuell hinzu. Leere Felder bleiben leer."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.beans.map((bean) => {
            const active = data.activeBeanId === bean.id;
            return (
              <li
                key={bean.id}
                className="rounded-[1.5rem] bg-[color:var(--surface)] px-5 py-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl tracking-tight">{bean.name}</p>
                    {active ? (
                      <p className="text-sm text-[color:var(--brand)]">Aktiv</p>
                    ) : null}
                  </div>
                </div>
                <dl className="space-y-1 text-base text-[color:var(--quiet)]">
                  <Field label="Röster" value={bean.roaster} />
                  <Field label="Herkunft" value={bean.origin} />
                  <Field label="Röstung" value={bean.roast} />
                  <Field label="Notizen" value={bean.notes} />
                  <Field
                    label="Rest"
                    value={
                      typeof bean.remainingGrams === "number"
                        ? `${bean.remainingGrams} g`
                        : undefined
                    }
                  />
                  <Field label="Hinzugefügt" value={formatAdded(bean.addedAt)} />
                </dl>
                <GrindSettingField bean={bean} onSave={updateBean} />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="lg"
                    variant="secondary"
                    className="h-12 rounded-2xl bg-[color:var(--surface-strong)]"
                    onClick={() => setActiveBeanId(bean.id)}
                    disabled={active}
                  >
                    Als aktiv
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-2xl"
                    onClick={() => {
                      if (window.confirm(`„${bean.name}“ entfernen?`)) {
                        removeBean(bean.id);
                      }
                    }}
                  >
                    Entfernen
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Mahlgrad je Bohne — gelernt aus echter Nutzung, kein globaler Standardwert. */
function GrindSettingField({
  bean,
  onSave,
}: {
  bean: CoffeeBean;
  onSave: (id: string, patch: Partial<CoffeeBean>) => void;
}) {
  const [draft, setDraft] = useState(bean.grindSetting ?? "");
  const dirty = draft.trim() !== (bean.grindSetting ?? "");

  return (
    <div className="flex flex-wrap items-center gap-2 text-base text-[color:var(--quiet)]">
      <label className="flex items-center gap-2">
        <span>Mahlgrad:</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 10))}
          placeholder="z. B. 10"
          className="h-10 w-24 rounded-xl bg-[color:var(--bg)] px-3 text-[color:var(--ink)] outline-none ring-[color:var(--brand)] focus:ring-2"
        />
      </label>
      {dirty ? (
        <Button
          type="button"
          size="sm"
          className="h-10 rounded-xl"
          onClick={() => onSave(bean.id, { grindSetting: draft.trim() || undefined })}
        >
          Speichern
        </Button>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="inline text-[color:var(--quiet)]">{label}: </dt>
      <dd className="inline text-[color:var(--ink)]">{value}</dd>
    </div>
  );
}

function formatAdded(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(t));
}
