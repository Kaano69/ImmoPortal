import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InboxTable } from "@/features/inbox/components/inbox-table";
import { InboxUpload } from "@/features/inbox/components/inbox-upload";
import { getInboxProperties, getPendingInboxItems } from "@/features/inbox/queries";

export const metadata: Metadata = {
  title: "Posteingang – Immobiliencockpit",
};

// Die Daten kommen aus der lokalen SQLite-DB und dürfen nicht beim Build eingefroren werden.
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [items, properties] = await Promise.all([getPendingInboxItems(), getInboxProperties()]);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dokumenten-Posteingang</h1>
        <p className="text-sm text-muted-foreground">
          Für das massenhafte Einpflegen gescannter Aktenordner und Cloud-Dateien: Lade beliebig
          viele PDFs auf einmal hoch. Objekt und Kategorie werden anhand des Dateinamens
          vorgeschlagen – bestätige die Ablage, um sie ins reguläre Dokumenten-Archiv zu übernehmen.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>PDFs hochladen</CardTitle>
        </CardHeader>
        <CardContent>
          <InboxUpload />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ausstehend ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <InboxTable items={items} properties={properties} />
        </CardContent>
      </Card>
    </main>
  );
}
