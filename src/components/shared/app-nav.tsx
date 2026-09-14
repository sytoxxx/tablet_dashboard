import Link from "next/link";
import { ArrowLeft, Coffee, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppNavProps = {
  showCoffee?: boolean;
  backLabel?: string;
};

/** Simple ← Zurück / Home — no menu complexity. */
export function AppNav({ showCoffee = true, backLabel = "Zurück" }: AppNavProps) {
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Navigation">
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="h-12 min-w-12 gap-2 rounded-2xl px-4 text-base text-[color:var(--quiet)] hover:bg-[color:var(--surface)] hover:text-[color:var(--ink)] active:scale-[0.97]"
        >
          <Link href="/">
            <ArrowLeft className="size-5" aria-hidden />
            <span>{backLabel}</span>
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="h-12 rounded-2xl px-3 text-base text-[color:var(--quiet)] hover:bg-[color:var(--surface)] hover:text-[color:var(--ink)] active:scale-[0.97]"
        >
          <Link href="/" aria-label="Zur Personenwahl">
            <Home className="size-5" aria-hidden />
            <span className="sr-only sm:not-sr-only sm:ml-1">Home</span>
          </Link>
        </Button>
      </div>
      {showCoffee ? (
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="h-12 gap-2 rounded-2xl bg-[color:var(--surface)] px-5 text-base text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)] active:scale-[0.97]"
        >
          <Link href="/kaffee">
            <Coffee className="size-5" aria-hidden />
            Kaffee
          </Link>
        </Button>
      ) : null}
    </nav>
  );
}
