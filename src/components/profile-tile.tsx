import Link from "next/link";
import { cn } from "@/lib/utils";
import { unlockLeaveReminderAudio } from "@/lib/morning/leave-reminder-audio";
import { setActivePersonId } from "@/lib/profile/active-person";
import type { PersonId } from "@/lib/types";

type ProfileTileProps = {
  href: string;
  name: string;
  hint: string;
  accent: string;
  avatar?: string;
  delayMs?: number;
  personId?: PersonId;
};

export function ProfileTile({
  href,
  name,
  hint,
  accent,
  avatar,
  delayMs = 0,
  personId,
}: ProfileTileProps) {
  return (
    <Link
      href={href}
      onClick={() => {
        void unlockLeaveReminderAudio();
        if (personId) setActivePersonId(personId);
      }}
      className={cn(
        "group relative flex min-h-48 flex-col justify-between rounded-[1.75rem] border border-[color:var(--hairline)] px-7 py-8 sm:min-h-56",
        "bg-[color:var(--surface)] text-[color:var(--ink)]",
        "transition-[transform,box-shadow,background-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_1px_0_var(--hairline),0_12px_32px_-24px_rgba(28,36,48,0.35)]",
        "active:scale-[0.97] active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--bg)]",
        "animate-rise",
      )}
      style={{ animationDelay: `${delayMs}ms`, ["--tile-accent" as string]: accent }}
    >
      <span
        className="absolute inset-x-7 top-0 h-1 rounded-full opacity-80"
        style={{ background: "var(--tile-accent)" }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <span className="font-display text-4xl tracking-tight sm:text-5xl landscape-tablet:text-[3rem]">
          {name}
        </span>
        {avatar ? (
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: accent }}
            aria-hidden
          >
            {avatar}
          </span>
        ) : null}
      </div>
      <span className="text-base text-[color:var(--quiet)] sm:text-lg">{hint}</span>
    </Link>
  );
}
