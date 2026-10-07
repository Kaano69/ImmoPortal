import type { Metadata } from "next";

import { SaleCalculator } from "@/features/property-sale/components/sale-calculator";
import { getSalePresets } from "@/features/property-sale/queries";
import { todayIso } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Verkaufs- & Exit-Rechner – Immobiliencockpit",
};

// Die Vorbelegungen kommen aus der lokalen SQLite-DB und dürfen nicht beim Build eingefroren werden.
export const dynamic = "force-dynamic";

export default async function PropertySalePage() {
  const presets = await getSalePresets();

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Verkaufs- &amp; Exit-Rechner</h1>
        <p className="text-sm text-muted-foreground">
          Simuliert Verkaufswert, Netto-Auszahlung und wirtschaftlichen Gewinn – inklusive
          Steuer-Check zur 10-Jahres-Frist und Eigennutzung.
        </p>
      </header>
      <SaleCalculator presets={presets} today={todayIso()} />
    </main>
  );
}
