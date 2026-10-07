import { Building2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSqm } from "@/lib/formatters";

import type { PropertyRow } from "../queries";

export function PropertiesTable({ properties }: { properties: PropertyRow[] }) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Building2 className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Noch keine Immobilien angelegt</p>
        <p className="text-sm text-muted-foreground">
          Lege über „Immobilie anlegen“ dein erstes Objekt an.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Name</TableHead>
          <TableHead>Adresse</TableHead>
          <TableHead className="text-right">Einheiten</TableHead>
          <TableHead className="text-right">Gesamtfläche</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Aktionen</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map((property) => (
          <TableRow key={property.id} className={property.isArchived ? "text-muted-foreground" : undefined}>
            <TableCell className="font-medium">
              {property.name}
              {property.isArchived ? (
                <Badge variant="secondary" className="ml-2">
                  Archiviert
                </Badge>
              ) : null}
            </TableCell>
            <TableCell>
              {property.street}, {property.zip} {property.city}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {property.unitCount}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {property.totalSqm === null ? "–" : formatSqm(property.totalSqm)}
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link href={`/properties/${property.id}`}>Details ansehen</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
