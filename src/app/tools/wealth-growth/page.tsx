import type { Metadata } from "next";

import { WealthGrowthDashboard } from "@/features/wealth-growth/components/wealth-growth-dashboard";
import { getWealthProperties } from "@/features/wealth-growth/queries";
import { todayIso } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Vermögenswachstum – Immobiliencockpit",
};

// Die Daten kommen aus der lokalen SQLite-DB und dürfen nicht beim Build eingefroren werden.
export const dynamic = "force-dynamic";

export default async function WealthGrowthPage() {
  const properties = await getWealthProperties();

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Vermögenswachstum</h1>
        <p className="text-sm text-muted-foreground">
          Um wie viel wächst das Nettovermögen mit jedem Jahr? Eigenkapital heute, monatlicher
          Aufbau durch Tilgung und eine Prognose über die nächsten Jahre.
        </p>
      </header>
      <WealthGrowthDashboard properties={properties} today={todayIso()} />
    </main>
  );
}
