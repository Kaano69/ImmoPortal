import type { Metadata } from "next";

import { RenovationCalculator } from "@/features/renovation/components/renovation-calculator";
import { getRenovationPresets } from "@/features/renovation/queries";
import { todayIso } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Sanierungsrechner – Immobiliencockpit",
};

// Die Vorbelegungen kommen aus der lokalen SQLite-DB und dürfen nicht beim Build eingefroren werden.
export const dynamic = "force-dynamic";

export default async function RenovationPage() {
  const presets = await getRenovationPresets();

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Renovierungs- &amp; Sanierungsrechner</h1>
        <p className="text-sm text-muted-foreground">
          Kalkuliert Gewerke, prüft die 15-%-Grenze für anschaffungsnahe Herstellungskosten und zeigt
          die Wirkung auf Rendite und Mietpotenzial.
        </p>
      </header>
      <RenovationCalculator presets={presets} today={todayIso()} />
    </main>
  );
}
