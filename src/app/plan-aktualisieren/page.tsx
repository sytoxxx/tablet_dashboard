"use client";

import { useRef, useState } from "react";
import { AppNav } from "@/components/shared/app-nav";
import { Button } from "@/components/ui/button";
import { Camera, ImagePlus } from "lucide-react";

export default function PlanUploadPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "uploaded">("idle");

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFileName(file.name);
    setStatus("ready");
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6 sm:px-8">
      <AppNav showSettings={false} backLabel="Einstellungen" backHref="/einstellungen" />

      <header className="space-y-2">
        <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">
          Plan aktualisieren
        </p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Foto oder Datei</h1>
        <p className="text-lg text-[color:var(--quiet)]">
          Vorschau prüfen, dann hochladen. Es wird nichts automatisch gespeichert — keine OCR in
          dieser Phase.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          size="lg"
          className="h-14 gap-2 rounded-2xl px-5 active:scale-[0.97]"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-5" aria-hidden />
          Datei wählen
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="h-14 gap-2 rounded-2xl bg-[color:var(--surface)] px-5 active:scale-[0.97]"
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="size-5" aria-hidden />
          Kamera
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      {previewUrl ? (
        <div className="space-y-4">
          <p className="text-sm text-[color:var(--quiet)]">{fileName}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Vorschau des hochgeladenen Plans"
            className="max-h-[50vh] w-full rounded-[1.5rem] object-contain bg-[color:var(--surface)]"
          />
        </div>
      ) : (
        <div className="rounded-[1.5rem] bg-[color:var(--surface)] px-6 py-16 text-center text-[color:var(--quiet)]">
          Noch keine Datei — Datei wählen oder Kamera nutzen.
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className="h-14 rounded-2xl text-base active:scale-[0.97]"
        disabled={status !== "ready"}
        onClick={() => setStatus("uploaded")}
      >
        Hochladen
      </Button>

      {status === "uploaded" ? (
        <p
          role="status"
          className="rounded-2xl bg-[color:var(--surface)] px-5 py-4 text-lg text-[color:var(--brand)]"
        >
          Bild bereit für Analyse.
        </p>
      ) : null}
    </main>
  );
}
