import { Suspense } from "react";
import ZugangForm from "./zugang-form";

export default function ZugangPage() {
  return (
    <Suspense
      fallback={
        <main className="morning-shell mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
          <p className="text-center text-[color:var(--quiet)]">Laden…</p>
        </main>
      }
    >
      <ZugangForm />
    </Suspense>
  );
}
