import type { Metadata } from "next";
import { JarvisPanel } from "@/components/jarvis/jarvis-panel";

export const metadata: Metadata = {
  title: "Jarvis · Coffee Morning",
  description: "Persönliche Morgenfragen auf Basis der Daily Overview.",
};

export default function JarvisPage() {
  return (
    <main className="min-h-dvh">
      <JarvisPanel />
    </main>
  );
}
