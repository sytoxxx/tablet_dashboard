import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Coffee } from "lucide-react";

type AppHeaderProps = {
  backHref?: string;
  backLabel?: string;
  showCoffee?: boolean;
};

export function AppHeader({
  backHref = "/",
  backLabel = "Home",
  showCoffee = true,
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Button
        asChild
        variant="ghost"
        size="lg"
        className="h-12 rounded-2xl px-4 text-base text-[color:var(--quiet)] hover:bg-[color:var(--surface)] hover:text-[color:var(--ink)]"
      >
        <Link href={backHref}>{backLabel}</Link>
      </Button>
      {showCoffee ? (
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="h-12 gap-2 rounded-2xl bg-[color:var(--surface)] px-5 text-base text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)]"
        >
          <Link href="/kaffee">
            <Coffee className="size-5" aria-hidden />
            Kaffee
          </Link>
        </Button>
      ) : null}
    </header>
  );
}
