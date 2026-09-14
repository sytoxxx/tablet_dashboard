"use client";

import type { ReactNode } from "react";
import { AppNav } from "@/components/shared/app-nav";
import { AdminNav } from "@/components/admin/admin-nav";
import { OfflineBanner } from "@/components/admin/offline-banner";

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
      <AppNav showSettings={false} backLabel="Home" backHref="/" />
      <OfflineBanner />
      <header className="space-y-2">
        <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">Admin</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
        {subtitle ? <p className="text-lg text-[color:var(--quiet)]">{subtitle}</p> : null}
      </header>
      <AdminNav />
      {children}
    </main>
  );
}
