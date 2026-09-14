"use client";

import { useCallback, useState } from "react";
import { useOnlineStatus } from "@/components/admin/offline-banner";
import { useVisibleInterval } from "@/hooks/use-visible-interval";

type BusStatusResponse = {
  ok?: boolean;
  status: "live" | "testdata" | "offline" | "disabled";
  statusLabel: string;
  activeProvider: string;
  steiermarkConfigured: boolean;
  vaoConfigured: boolean;
  busProviderEnv: string;
  lastSuccessAt: string | null;
  lastError: string | null;
  message: string;
};

const POLL_MS = 60_000;

/**
 * Admin-only bus connection indicator (Live / Testdaten / Offline).
 * Never shown on morning dashboards.
 */
export function BusStatusPanel({
  preferredProvider,
}: {
  preferredProvider?: string | null;
}) {
  const online = useOnlineStatus();
  const [status, setStatus] = useState<BusStatusResponse | null>(null);

  const refresh = useCallback(async () => {
    let lastSuccessAt: string | null = null;
    let lastError: string | null = null;
    try {
      const raw = sessionStorage.getItem("coffee-morning-bus-meta");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          at?: string;
          warning?: string | null;
        };
        lastSuccessAt = parsed.at ?? null;
        lastError = parsed.warning ?? null;
      }
    } catch {
      /* ignore */
    }

    if (!online) {
      setStatus({
        status: "offline",
        statusLabel: "Offline",
        activeProvider: preferredProvider || "local",
        steiermarkConfigured: false,
        vaoConfigured: false,
        busProviderEnv: "auto",
        lastSuccessAt,
        lastError: "Keine Netzwerkverbindung",
        message: "Offline — zuletzt bekannte Daten behalten.",
      });
      return;
    }
    try {
      const params = new URLSearchParams();
      if (preferredProvider) params.set("preferredProvider", preferredProvider);
      if (lastSuccessAt) params.set("lastSuccessAt", lastSuccessAt);
      if (lastError) params.set("lastError", lastError);
      const res = await fetch(`/api/bus/status?${params.toString()}`);
      const json = (await res.json()) as BusStatusResponse;
      setStatus(json);
    } catch {
      setStatus({
        status: "offline",
        statusLabel: "Offline",
        activeProvider: preferredProvider || "local",
        steiermarkConfigured: false,
        vaoConfigured: false,
        busProviderEnv: "auto",
        lastSuccessAt,
        lastError: "Statusabfrage fehlgeschlagen",
        message: "Status gerade nicht erreichbar.",
      });
    }
  }, [online, preferredProvider]);

  useVisibleInterval(refresh, POLL_MS, true);

  if (!status) {
    return (
      <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--quiet)]">
        Bus-Status wird geladen…
      </div>
    );
  }

  const dot =
    status.status === "live"
      ? "bg-emerald-600"
      : status.status === "offline"
        ? "bg-amber-600"
        : "bg-[color:var(--quiet)]";

  return (
    <section className="space-y-2 rounded-2xl bg-[color:var(--surface)] px-4 py-4">
      <h2 className="font-display text-xl tracking-tight">Bus-Verbindung</h2>
      <p className="flex items-center gap-2 text-lg">
        <span className={`inline-block size-2.5 rounded-full ${dot}`} aria-hidden />
        <span>{status.statusLabel}</span>
      </p>
      <dl className="grid gap-1 text-sm text-[color:var(--quiet)] sm:grid-cols-2">
        <div>
          <dt className="inline">Provider: </dt>
          <dd className="inline font-medium text-[color:var(--ink)]">
            {status.activeProvider}
          </dd>
        </div>
        <div>
          <dt className="inline">BUS_PROVIDER: </dt>
          <dd className="inline font-medium text-[color:var(--ink)]">
            {status.busProviderEnv}
          </dd>
        </div>
        <div>
          <dt className="inline">TRIAS: </dt>
          <dd className="inline">
            {status.steiermarkConfigured ? "konfiguriert" : "fehlt"}
          </dd>
        </div>
        <div>
          <dt className="inline">VAO: </dt>
          <dd className="inline">{status.vaoConfigured ? "konfiguriert" : "fehlt"}</dd>
        </div>
        {status.lastSuccessAt ? (
          <div className="sm:col-span-2">
            <dt className="inline">Letzter Abruf: </dt>
            <dd className="inline">
              {new Date(status.lastSuccessAt).toLocaleString("de-AT")}
            </dd>
          </div>
        ) : null}
        {status.lastError ? (
          <div className="sm:col-span-2">
            <dt className="inline">Hinweis: </dt>
            <dd className="inline">{status.lastError}</dd>
          </div>
        ) : null}
      </dl>
      <p className="text-sm text-[color:var(--quiet)]">{status.message}</p>
    </section>
  );
}
