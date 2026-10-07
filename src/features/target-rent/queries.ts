import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { properties } from "@/db/schema";

/** Hinterlegte Werte eines bestehenden Objekts als Vorbelegung für den Zielmieten-Rechner. */
export type TargetRentPreset = {
  id: string;
  name: string;
  /** Eingetragene Gesamtfläche, sonst Summe der Einheitsflächen. */
  areaSqm: number | null;
  /** Aktuelle Kaltmiete aller Einheiten mit aktivem Mietvertrag, in Cent pro Monat. */
  currentColdRentCents: number;
  /** Nebenkosten und USt aller Einheiten mit aktivem Mietvertrag, in Cent pro Monat. */
  additionalIncomeCents: number;
  loanPaymentMonthlyCents: number | null;
  annualCostsCents: number | null;
  annualMaintenanceReserveCents: number | null;
  vacancyPercent: number | null;
  /** Marktwert als Näherung für den Kaufpreis. */
  purchasePriceCents: number | null;
};

export async function getTargetRentPresets(): Promise<TargetRentPreset[]> {
  const rows = await db.query.properties.findMany({
    where: eq(properties.isArchived, false),
    orderBy: [asc(properties.name)],
    with: { units: { with: { leases: true } } },
  });

  return rows.map((property) => {
    let unitSqm = 0;
    let hasUnitSqm = false;
    let currentColdRentCents = 0;
    let additionalIncomeCents = 0;

    for (const unit of property.units) {
      if (unit.sqm !== null) {
        unitSqm += unit.sqm;
        hasUnitSqm = true;
      }
      if (unit.leases.some((lease) => lease.isActive)) {
        currentColdRentCents += unit.coldRentCents;
        additionalIncomeCents += unit.additionalCostsCents;
      }
    }

    return {
      id: property.id,
      name: property.name,
      areaSqm: property.totalSqm ?? (hasUnitSqm ? unitSqm : null),
      currentColdRentCents,
      additionalIncomeCents,
      loanPaymentMonthlyCents: property.monthlyLoanPaymentCents,
      annualCostsCents: property.annualCostsCents,
      annualMaintenanceReserveCents: property.annualMaintenanceReserveCents,
      vacancyPercent: property.vacancyReservePercent,
      purchasePriceCents: property.marketValueCents,
    };
  });
}
