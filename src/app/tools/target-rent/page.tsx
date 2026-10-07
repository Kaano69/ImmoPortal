import type { Metadata } from "next";

import { TargetRentCalculator } from "@/features/target-rent/components/target-rent-calculator";
import { getTargetRentPresets } from "@/features/target-rent/queries";

export const metadata: Metadata = {
  title: "Zielmieten-Rechner – Immobiliencockpit",
};

// Die Vorbelegungen kommen aus der lokalen SQLite-DB und dürfen nicht beim Build eingefroren werden.
export const dynamic = "force-dynamic";

export default async function TargetRentPage() {
  const presets = await getTargetRentPresets();

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Zielmieten- &amp; Margenrechner</h1>
        <p className="text-sm text-muted-foreground">
          Berechnet die Kaltmiete, die Darlehen, Kosten, Rücklagen, Leerstand und deinen
          Wunschüberschuss deckt – für Mietanpassungen und Neuankäufe.
        </p>
      </header>
      <TargetRentCalculator presets={presets} />
    </main>
  );
}
