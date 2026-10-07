"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCentsToEuro, formatSqm } from "@/lib/formatters";
import { UNIT_TYPE_LABELS } from "@/lib/labels";

import type { UnitSummary } from "../queries";

/** Anzahl der Einheiten als Link-Button; öffnet eine Schnellansicht mit Direktlinks zu jeder Einheit. */
export function UnitsQuickView({
  propertyId,
  propertyName,
  units,
}: {
  propertyId: string;
  propertyName: string;
  units: UnitSummary[];
}) {
  if (units.length === 0) {
    return <span className="tabular-nums">0</span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-md px-2 py-1 font-medium tabular-nums underline decoration-dotted underline-offset-4 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`${units.length} Einheiten von ${propertyName} anzeigen`}
        >
          {units.length}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Einheiten – {propertyName}</DialogTitle>
          <DialogDescription>
            Ein Klick auf eine Einheit öffnet die gefilterte Ansicht im Objekt.
          </DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2">
          {units.map((unit) => (
            <li key={unit.id}>
              <Link
                href={`/properties/${propertyId}?unit=${unit.id}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border p-3 text-sm transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{unit.unitNumber}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {UNIT_TYPE_LABELS[unit.type]}
                    {unit.sqm !== null ? ` · ${formatSqm(unit.sqm)}` : ""}
                    {" · "}
                    {unit.tenantName ?? "kein Mieter"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-right tabular-nums">
                    <span className="block">{formatCentsToEuro(unit.coldRentCents)} kalt</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatCentsToEuro(unit.coldRentCents + unit.additionalCostsCents)} warm
                    </span>
                  </span>
                  <Badge variant={unit.tenantName ? "success" : "warning"}>
                    {unit.tenantName ? "Vermietet" : "Leerstand"}
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Schließen
            </Button>
          </DialogClose>
          <Button asChild>
            <Link href={`/properties/${propertyId}`}>Objekt öffnen</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
