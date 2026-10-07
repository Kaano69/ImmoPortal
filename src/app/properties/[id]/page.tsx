import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentArchive } from "@/features/documents/components/document-archive";
import { getMonthlyCashflow } from "@/features/finance/actions";
import { FinanceTab } from "@/features/finance/components/finance-tab";
import { PropertyDangerActions } from "@/features/properties/components/property-danger-actions";
import { EditPropertyDialog } from "@/features/properties/components/edit-property-dialog";
import { getPropertyDetail } from "@/features/properties/queries";
import { CreateUnitDialog } from "@/features/units/components/unit-dialogs";
import { UnitsTable } from "@/features/units/components/units-table";
import { currentYearMonth, isYearMonth } from "@/lib/dates";
import { formatCentsToEuro, formatDate, formatPercent, formatSqm } from "@/lib/formatters";

// Die Daten kommen aus der lokalen SQLite-DB und dürfen nicht beim Build eingefroren werden.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; month?: string; unit?: string }>;
};

const TABS = ["units", "documents", "finance"] as const;
type TabValue = (typeof TABS)[number];

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  return { title: detail ? `${detail.property.name} – Immobiliencockpit` : "Immobiliencockpit" };
}

function centsToInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

function MasterDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function PropertyDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab, month, unit: unitFilter } = await searchParams;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const activeTab: TabValue = TABS.find((value) => value === tab) ?? "units";
  const yearMonth = month && isYearMonth(month) ? month : currentYearMonth();
  const cashflow = await getMonthlyCashflow(id, yearMonth);

  const { property, units, documents, tenants } = detail;
  // Direktlink aus der Schnellansicht: nur die gewählte Einheit zeigen.
  const focusedUnit = unitFilter ? units.find((unit) => unit.id === unitFilter) : undefined;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <div className="grid gap-3">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Zurück zur Übersicht
        </Link>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
              {property.name}
              {property.isArchived ? <Badge variant="secondary">Archiviert</Badge> : null}
            </h1>
            <p className="text-sm text-muted-foreground">
              {property.street}, {property.zip} {property.city}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <EditPropertyDialog
            propertyId={property.id}
            defaults={{
              name: property.name,
              street: property.street,
              zip: property.zip,
              city: property.city,
              totalSqm: property.totalSqm === null ? "" : String(property.totalSqm).replace(".", ","),
              marketValue: centsToInput(property.marketValueCents),
              buildYear: property.buildYear === null ? "" : String(property.buildYear),
              purchaseYear: property.purchaseYear === null ? "" : String(property.purchaseYear),
              purchaseDate: property.purchaseDate ?? "",
              acquisitionCost: centsToInput(property.acquisitionCostCents),
              loanBalance: centsToInput(property.loanBalanceCents),
              loanBalanceDate: property.loanBalanceDate ?? "",
              loanInterest:
                property.loanInterestPercent === null
                  ? ""
                  : String(property.loanInterestPercent).replace(".", ","),
              monthlyLoanPayment: centsToInput(property.monthlyLoanPaymentCents),
              annualCosts: centsToInput(property.annualCostsCents),
              annualMaintenanceReserve: centsToInput(property.annualMaintenanceReserveCents),
              vacancyReserve:
                property.vacancyReservePercent === null
                  ? ""
                  : String(property.vacancyReservePercent).replace(".", ","),
            }}
          />
          <PropertyDangerActions
            propertyId={property.id}
            propertyName={property.name}
            isArchived={property.isArchived}
          />
          </div>
        </header>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            <MasterDatum label="Straße" value={property.street} />
            <MasterDatum label="PLZ / Ort" value={`${property.zip} ${property.city}`} />
            <MasterDatum
              label="Wohnfläche"
              value={property.totalSqm === null ? "–" : formatSqm(property.totalSqm)}
            />
            <MasterDatum
              label="Baujahr"
              value={property.buildYear === null ? "–" : String(property.buildYear)}
            />
            <MasterDatum
              label="Kaufjahr"
              value={property.purchaseYear === null ? "–" : String(property.purchaseYear)}
            />
            <MasterDatum
              label="Marktwert"
              value={
                property.marketValueCents === null
                  ? "–"
                  : formatCentsToEuro(property.marketValueCents)
              }
            />
            <MasterDatum label="Angelegt am" value={formatDate(property.createdAt)} />
          </dl>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
            <MasterDatum
              label="Darlehensrate / Monat"
              value={
                property.monthlyLoanPaymentCents === null
                  ? "–"
                  : formatCentsToEuro(property.monthlyLoanPaymentCents)
              }
            />
            <MasterDatum
              label="Nicht umlegbare Kosten / Jahr"
              value={
                property.annualCostsCents === null
                  ? "–"
                  : formatCentsToEuro(property.annualCostsCents)
              }
            />
            <MasterDatum
              label="Instandhaltungsrücklage / Jahr"
              value={
                property.annualMaintenanceReserveCents === null
                  ? "–"
                  : formatCentsToEuro(property.annualMaintenanceReserveCents)
              }
            />
            <MasterDatum
              label="Kalkulierter Leerstand"
              value={
                property.vacancyReservePercent === null
                  ? "–"
                  : formatPercent(property.vacancyReservePercent)
              }
            />
          </dl>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-5">
            <MasterDatum
              label="Kaufdatum"
              value={property.purchaseDate === null ? "–" : formatDate(property.purchaseDate)}
            />
            <MasterDatum
              label="Anschaffungskosten"
              value={
                property.acquisitionCostCents === null
                  ? "–"
                  : formatCentsToEuro(property.acquisitionCostCents)
              }
            />
            <MasterDatum
              label="Restschuld"
              value={
                property.loanBalanceCents === null
                  ? "–"
                  : `${formatCentsToEuro(property.loanBalanceCents)}${
                      property.loanBalanceDate ? ` (${formatDate(property.loanBalanceDate)})` : ""
                    }`
              }
            />
            <MasterDatum
              label="Darlehenszins"
              value={
                property.loanInterestPercent === null
                  ? "–"
                  : formatPercent(property.loanInterestPercent)
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="units">Einheiten &amp; Mieter</TabsTrigger>
          <TabsTrigger value="documents">Dokumenten-Archiv</TabsTrigger>
          <TabsTrigger value="finance">Finanzen &amp; Zahlungen</TabsTrigger>
        </TabsList>

        <TabsContent value="units">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Einheiten ({units.length})</CardTitle>
              <CreateUnitDialog propertyId={property.id} />
            </CardHeader>
            <CardContent>
              {focusedUnit ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-accent/40 px-3 py-2 text-sm">
                  <span>
                    Gefiltert: <span className="font-medium">{focusedUnit.unitNumber}</span>
                  </span>
                  <Link
                    href={`/properties/${property.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    Alle Einheiten anzeigen
                  </Link>
                </div>
              ) : null}
              <UnitsTable units={focusedUnit ? [focusedUnit] : units} tenants={tenants} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentArchive
            propertyId={property.id}
            documents={documents}
            units={units.map((unit) => ({ id: unit.id, unitNumber: unit.unitNumber }))}
          />
        </TabsContent>

        <TabsContent value="finance">
          <FinanceTab
            propertyId={property.id}
            cashflow={cashflow}
            units={units.map((unit) => ({ id: unit.id, unitNumber: unit.unitNumber }))}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
