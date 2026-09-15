"use client";

import { MusicCenter } from "@/components/music/music-center";
import { MusicShell } from "@/components/music/music-shell";

export default function MusikPage() {
  return (
    <main>
      <MusicShell>
        <MusicCenter />
      </MusicShell>
    </main>
  );
}
