import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { DataProvider } from "@/components/providers/data-provider";
import {
  DevTimePanel,
  DevTimeProvider,
} from "@/components/providers/dev-time-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coffee Morning Dashboard",
  description:
    "Minimaler Morgen-Tablet-Dashboard neben der Kaffeemaschine — Profile, Tagesplan und Kaffee-Stubs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e6ebf1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${manrope.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <DataProvider>
          <DevTimeProvider>
            {children}
            <DevTimePanel />
          </DevTimeProvider>
        </DataProvider>
      </body>
    </html>
  );
}
