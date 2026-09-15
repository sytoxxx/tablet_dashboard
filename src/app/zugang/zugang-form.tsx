"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ZugangForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Zugang gerade nicht eingerichtet."
            : "Zugangscode ungültig.",
        );
        setPending(false);
        return;
      }
      const next = searchParams.get("next");
      const target =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.replace(target);
      router.refresh();
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
      setPending(false);
    }
  }

  return (
    <main className="morning-shell mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="animate-rise space-y-3 text-center">
        <p className="text-4xl" aria-hidden>
          ☕
        </p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          Coffee Morning
        </h1>
        <p className="text-lg text-[color:var(--quiet)]">Zugangscode</p>
      </header>

      <form
        onSubmit={onSubmit}
        className="animate-rise flex flex-col gap-4"
        style={{ animationDelay: "60ms" }}
      >
        <label className="sr-only" htmlFor="access-code">
          Zugangscode
        </label>
        <input
          id="access-code"
          name="code"
          type="password"
          autoComplete="current-password"
          inputMode="text"
          enterKeyHint="go"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-14 w-full rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] px-4 text-center text-xl tracking-[0.2em] text-[color:var(--ink)] outline-none focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/40"
          placeholder="********"
          required
          disabled={pending}
        />
        {error ? (
          <p className="text-center text-base text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={pending || !code}
          className="h-14 rounded-2xl text-lg"
        >
          {pending ? "Prüfen…" : "Weiter"}
        </Button>
      </form>
    </main>
  );
}
