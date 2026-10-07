import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MainNav } from "@/components/main-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "Immobiliencockpit",
  description: "Lokales, autarkes Cockpit für die Immobilienverwaltung.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
            <span className="font-semibold tracking-tight">Immobiliencockpit</span>
            <MainNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
