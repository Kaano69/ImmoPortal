import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { properties } from "@/db/schema";

/** Hinterlegte Werte eines bestehenden Objekts als Vorbelegung für den Sanierungsrechner. */
export type RenovationPreset = {
  id: string;
  name: string;
  acquisitionCostCents: number | null;
  /** Exaktes Kaufdatum (ISO); `null`, wenn unbekannt. */
  purchaseDate: string | null;
  areaSqm: number | null;
  /** Aktuelle Kaltmiete aller Einheiten mit aktivem Mietvertrag, in Cent pro Monat. */
  currentColdRentCents: number;
};

export async function getRenovationPresets(): Promise<RenovationPreset[]> {
  const rows = await db.query.properties.findMany({
    where: eq(properties.isArchived, false),
    orderBy: [asc(properties.name)],
    with: { units: { with: { leases: true } } },
  });

  return rows.map((property) => {
    let unitSqm = 0;
    let hasUnitSqm = false;
    let currentColdRentCents = 0;
    for (const unit of property.units) {
      if (unit.sqm !== null) {
        unitSqm += unit.sqm;
        hasUnitSqm = true;
      }
      if (unit.leases.some((lease) => lease.isActive)) currentColdRentCents += unit.coldRentCents;
    }
    return {
      id: property.id,
      name: property.name,
      acquisitionCostCents: property.acquisitionCostCents,
      purchaseDate: property.purchaseDate,
      areaSqm: property.totalSqm ?? (hasUnitSqm ? unitSqm : null),
      currentColdRentCents,
    };
  });
}
