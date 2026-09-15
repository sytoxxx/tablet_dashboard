"use client";

import { Speaker } from "lucide-react";
import { useMusic } from "@/components/music/music-command-provider";
import { MorningNav } from "@/components/shared/morning-nav";

function MusicHeader() {
  const { ready, source } = useMusic();
  return (
    <header className="animate-rise flex items-start justify-between gap-4">
      <div className="space-y-2">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl landscape-tablet:text-4xl">
          Musik
        </h1>
        <p className="text-base text-[color:var(--quiet)] sm:text-lg">
          {ready ? source.statusLabel : "…"}
        </p>
      </div>
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--surface)] text-[color:var(--quiet)]"
        aria-hidden
        title="Lautsprecher"
      >
        <Speaker className="size-5 opacity-70" />
      </div>
    </header>
  );
}

/** Shell chrome only — MusicCommandProvider lives in root layout for mini-player. */
export function MusicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="morning-shell mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:gap-8 sm:px-8 sm:py-8 landscape-tablet:gap-5 landscape-tablet:py-5">
      <MorningNav showCoffee showMusic={false} />
      <MusicHeader />
      <div className="animate-rise" style={{ animationDelay: "60ms" }}>
        {children}
      </div>
    </div>
  );
}
