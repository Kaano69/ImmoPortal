"use client";

import { FileSearch, FileText, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { DocumentCategory } from "@/db/schema";
import type { DocumentDetail } from "@/features/properties/queries";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { FILTER_ALL as ALL, FILTER_PROPERTY_LEVEL as PROPERTY_LEVEL, filterDocuments } from "../filter";
import { DocumentsTable } from "./documents-table";
import { UploadDocumentDialog } from "./upload-document-dialog";

// Reihenfolge der Hauptkategorien wie in der Ablage (01 … 10, Sonstiges).
const CATEGORY_ORDER = Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[];

type Unit = { id: string; unitNumber: string };

export function DocumentArchive({
  propertyId,
  documents,
  units,
}: {
  propertyId: string;
  documents: DocumentDetail[];
  units: Unit[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategory | typeof ALL>(ALL);
  const [unit, setUnit] = useState<string>(ALL);

  const counts = useMemo(() => {
    const result = new Map<DocumentCategory, number>();
    for (const document of documents) {
      result.set(document.category, (result.get(document.category) ?? 0) + 1);
    }
    return result;
  }, [documents]);

  const filtered = useMemo(
    () => filterDocuments(documents, { query, category, unit }),
    [documents, query, category, unit],
  );

  const isFiltered = query.trim() !== "" || category !== ALL || unit !== ALL;
  const presentCategories = CATEGORY_ORDER.filter((value) => counts.has(value));

  function resetFilters() {
    setQuery("");
    setCategory(ALL);
    setUnit(ALL);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>
          Dokumenten-Archiv ({isFiltered ? `${filtered.length} von ${documents.length}` : documents.length})
        </CardTitle>
        <UploadDocumentDialog
          propertyId={propertyId}
          units={units}
          defaultCategory={category === ALL ? undefined : category}
          defaultUnitId={unit === ALL || unit === PROPERTY_LEVEL ? undefined : unit}
        />
      </CardHeader>
      <CardContent className="grid gap-4">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">Noch keine Dokumente archiviert</p>
            <p className="text-sm text-muted-foreground">
              Lade über „Dokument hochladen“ die erste PDF hoch.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  aria-label="Dokumente durchsuchen"
                  placeholder="Nach Dateiname oder Schlagwort suchen …"
                  className="pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="archive-unit" className="sr-only">
                  Einheit
                </Label>
                <Select id="archive-unit" value={unit} onChange={(event) => setUnit(event.target.value)}>
                  <option value={ALL}>Alle Einheiten</option>
                  <option value={PROPERTY_LEVEL}>Nur ganzes Objekt</option>
                  {units.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.unitNumber}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Nach Kategorie filtern">
              {[ALL, ...presentCategories].map((value) => {
                const active = category === value;
                const label =
                  value === ALL ? "Alle" : DOCUMENT_CATEGORY_LABELS[value as DocumentCategory];
                const count = value === ALL ? documents.length : (counts.get(value as DocumentCategory) ?? 0);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(value as DocumentCategory | typeof ALL)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent",
                    )}
                  >
                    {label}
                    <span className={cn("text-xs tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>
                      {count}
                    </span>
                  </button>
                );
              })}
              {isFiltered ? (
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                  <X />
                  Filter zurücksetzen
                </Button>
              ) : null}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center" aria-live="polite">
                <FileSearch className="size-8 text-muted-foreground" aria-hidden />
                <p className="font-medium">Keine Dokumente gefunden</p>
                <p className="text-sm text-muted-foreground">
                  Passe Suche oder Filter an.
                </p>
              </div>
            ) : (
              <DocumentsTable documents={filtered} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
