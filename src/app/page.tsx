import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashflowCard } from "@/features/dashboard/components/cashflow-card";
import { KpiCards } from "@/features/dashboard/components/kpi-cards";
import { getMonthlyCashflow } from "@/features/finance/actions";
import { CreatePropertyDialog } from "@/features/properties/components/create-property-dialog";
import { PropertiesTable } from "@/features/properties/components/properties-table";
import { getDashboardData } from "@/features/properties/queries";

// Die Daten kommen aus der lokalen SQLite-DB und dürfen nicht beim Build eingefroren werden.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, cashflow] = await Promise.all([
    getDashboardData(),
    getMonthlyCashflow(),
  ]);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Immobiliencockpit</h1>
          <p className="text-sm text-muted-foreground">
            Überblick über Miete, Leerstand und Dokumente.
          </p>
        </div>
        <CreatePropertyDialog />
      </header>

      <KpiCards data={data} />

      <CashflowCard cashflow={cashflow} />

      <Card>
        <CardHeader>
          <CardTitle>Immobilien</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertiesTable properties={data.properties} />
        </CardContent>
      </Card>
    </main>
  );
}
