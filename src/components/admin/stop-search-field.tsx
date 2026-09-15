"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type StopPick = {
  id: string;
  name: string;
  place?: string;
};

type StopSearchFieldProps = {
  label: string;
  nameValue: string;
  idValue: string;
  onNameChange: (name: string) => void;
  onIdChange: (id: string) => void;
  nameInputName: string;
  idInputName: string;
  placeholder?: string;
};

type SearchState = {
  searchable: boolean | null;
  loading: boolean;
  message: string | null;
  hits: StopPick[];
  provider: string | null;
  isTestData: boolean;
};

/**
 * Admin-only stop picker: live search when TRIAS/VAO configured,
 * otherwise manual entry clearly labeled as Test-Konfiguration.
 */
export function StopSearchField({
  label,
  nameValue,
  idValue,
  onNameChange,
  onIdChange,
  nameInputName,
  idInputName,
  placeholder,
}: StopSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({
    searchable: null,
    loading: false,
    message: null,
    hits: [],
    provider: null,
    isTestData: true,
  });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/bus/stops");
        const json = (await res.json()) as {
          searchable?: boolean;
          provider?: string | null;
          message?: string;
          isTestData?: boolean;
        };
        setState((s) => ({
          ...s,
          searchable: Boolean(json.searchable),
          provider: json.provider ?? null,
          message: json.message ?? null,
          isTestData: Boolean(json.isTestData),
        }));
      } catch {
        setState((s) => ({
          ...s,
          searchable: false,
          message: "Suche nicht verfügbar — manuell eintragen.",
          isTestData: true,
        }));
      }
    })();
  }, []);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setState((s) => ({ ...s, message: "Mindestens 2 Zeichen.", hits: [] }));
      return;
    }
    setState((s) => ({ ...s, loading: true, message: null }));
    try {
      const res = await fetch(`/api/bus/stops?q=${encodeURIComponent(q)}`);
      const json = (await res.json()) as {
        searchable?: boolean;
        stops?: Array<{
          id: string;
          name: string;
          place?: string;
          locality?: string;
          provider?: string;
        }>;
        message?: string;
        provider?: string | null;
        isTestData?: boolean;
      };
      setState((s) => ({
        ...s,
        loading: false,
        searchable: Boolean(json.searchable),
        hits: (json.stops ?? []).map((h) => ({
          id: h.id,
          name: h.name,
          place: h.place ?? h.locality,
        })),
        message: [
          json.message,
          json.provider ? `Provider: ${json.provider}` : null,
          json.isTestData === false
            ? "Live-TRIAS"
            : json.isTestData
              ? "Testdaten"
              : null,
        ]
          .filter(Boolean)
          .join(" · "),
        provider: json.provider ?? null,
        isTestData: Boolean(json.isTestData),
      }));
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        hits: [],
        message: "Suche fehlgeschlagen — bitte manuell eintragen.",
        isTestData: true,
      }));
    }
  }, [query]);

  return (
    <div className="space-y-3 rounded-2xl bg-[color:var(--surface)] p-4">
      <p className="text-sm font-medium text-[color:var(--ink)]">{label}</p>
      {state.searchable === false ? (
        <p className="text-sm text-[color:var(--quiet)]">
          Lokale / Test-Konfiguration — kein Live-Zugang. Name und ID nur aus echten Quellen
          oder leer lassen (dann nur Testdaten-Fahrplan).
        </p>
      ) : state.searchable ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Haltestelle oder Ort suchen…"
              className="h-12 min-w-[12rem] flex-1 rounded-2xl bg-[color:var(--bg)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runSearch();
                }
              }}
            />
            <Button
              type="button"
              size="lg"
              className="h-12 rounded-2xl"
              disabled={state.loading}
              onClick={() => void runSearch()}
            >
              {state.loading ? "Suche…" : "Suchen"}
            </Button>
          </div>
          {state.message ? (
            <p className="text-sm text-[color:var(--quiet)]">{state.message}</p>
          ) : null}
          {state.hits.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {state.hits.map((hit) => (
                <li key={`${hit.id}-${hit.name}`}>
                  <button
                    type="button"
                    className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-[color:var(--bg)]"
                    onClick={() => {
                      onNameChange(hit.name);
                      onIdChange(hit.id);
                    }}
                  >
                    <span className="font-medium">{hit.name}</span>
                    <span className="text-sm text-[color:var(--quiet)]">
                      {[hit.place, hit.id].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--quiet)]">Prüfe Suchzugang…</p>
      )}

      <label className="block space-y-1">
        <span className="text-sm text-[color:var(--quiet)]">Name</span>
        <input
          name={nameInputName}
          value={nameValue}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-2xl bg-[color:var(--bg)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-[color:var(--quiet)]">
          Stop-ID (StopPointRef / VAO — leer = nur Testdaten-Fahrplan)
        </span>
        <input
          name={idInputName}
          value={idValue}
          onChange={(e) => onIdChange(e.target.value)}
          placeholder="nur aus Suche oder Provider, nicht erfinden"
          className="h-12 w-full rounded-2xl bg-[color:var(--bg)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
        />
      </label>
    </div>
  );
}
