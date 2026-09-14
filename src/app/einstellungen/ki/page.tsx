"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { PlanUploadFlow } from "@/components/plan/plan-upload-flow";

export default function KiSettingsPage() {
  return (
    <AdminShell
      title="KI"
      subtitle="Foto analysieren, Draft prüfen, Konflikte lösen, dann speichern — nie auto-replace."
    >
      <PlanUploadFlow embedded />
    </AdminShell>
  );
}
