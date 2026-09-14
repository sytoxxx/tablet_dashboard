import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Jarvis",
  description: "Lern-App — Coffee Morning Integration API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
