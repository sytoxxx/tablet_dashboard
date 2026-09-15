import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PersonNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-6 px-6">
      <h1 className="font-display text-4xl tracking-tight">Profil nicht gefunden</h1>
      <p className="text-lg text-[color:var(--quiet)]">
        Dieses Profil gibt es nicht. Bitte wähle jemand anderen auf dem Home-Screen.
      </p>
      <Button asChild size="lg" className="h-12 rounded-2xl px-5 text-base">
        <Link href="/">Zur Startseite</Link>
      </Button>
    </main>
  );
}
