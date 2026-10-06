import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUpload } from "@/features/documents/components/document-upload";
import { DocumentsTable } from "@/features/documents/components/documents-table";
import { getMonthlyCashflow } from "@/features/finance/actions";
import { FinanceTab } from "@/features/finance/components/finance-tab";
import { EditPropertyDialog } from "@/features/properties/components/edit-property-dialog";
import { getPropertyDetail } from "@/features/properties/queries";
import { CreateUnitDialog } from "@/features/units/components/unit-dialogs";
import { UnitsTable } from "@/features/units/components/units-table";
import { currentYearMonth, isYearMonth } from "@/lib/dates";
import { formatDate, formatSqm } from "@/lib/formatters";

// Die Daten kommen aus der lokalen SQLite-DB und dürfen nicht beim Build eingefroren werden.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; month?: string }>;
};

const TABS = ["units", "documents", "finance"] as const;
type TabValue = (typeof TABS)[number];

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  return { title: detail ? `${detail.property.name} – Immobiliencockpit` : "Immobiliencockpit" };
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
  const { tab, month } = await searchParams;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const activeTab: TabValue = TABS.find((value) => value === tab) ?? "units";
  const yearMonth = month && isYearMonth(month) ? month : currentYearMonth();
  const cashflow = await getMonthlyCashflow(id, yearMonth);

  const { property, units, documents, tenants } = detail;

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
            <h1 className="text-2xl font-bold tracking-tight">{property.name}</h1>
            <p className="text-sm text-muted-foreground">
              {property.street}, {property.zip} {property.city}
            </p>
          </div>
          <EditPropertyDialog
            propertyId={property.id}
            defaults={{
              name: property.name,
              street: property.street,
              zip: property.zip,
              city: property.city,
              totalSqm: property.totalSqm === null ? "" : String(property.totalSqm).replace(".", ","),
              buildYear: property.buildYear === null ? "" : String(property.buildYear),
              purchaseYear: property.purchaseYear === null ? "" : String(property.purchaseYear),
            }}
          />
        </header>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
            <MasterDatum label="Angelegt am" value={formatDate(property.createdAt)} />
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
              <UnitsTable units={units} tenants={tenants} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dokument hochladen</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                propertyId={property.id}
                units={units.map((unit) => ({ id: unit.id, unitNumber: unit.unitNumber }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Archiv ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentsTable documents={documents} />
            </CardContent>
          </Card>
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
