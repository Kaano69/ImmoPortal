import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { properties } from "@/db/schema";

/** Hinterlegte Werte eines bestehenden Objekts als Vorbelegung für den Verkaufsrechner. */
export type SalePreset = {
  id: string;
  name: string;
  marketValueCents: number | null;
  /** Exaktes Kaufdatum (ISO); `null`, wenn nur das Kaufjahr bekannt ist. */
  purchaseDate: string | null;
  purchaseYear: number | null;
  acquisitionCostCents: number | null;
  loanBalanceCents: number | null;
  loanBalanceDate: string | null;
  loanInterestPercent: number | null;
  monthlyPaymentCents: number | null;
};

export async function getSalePresets(): Promise<SalePreset[]> {
  const rows = await db
    .select()
    .from(properties)
    .where(eq(properties.isArchived, false))
    .orderBy(asc(properties.name));

  return rows.map((property) => ({
    id: property.id,
    name: property.name,
    marketValueCents: property.marketValueCents,
    purchaseDate: property.purchaseDate,
    purchaseYear: property.purchaseYear,
    acquisitionCostCents: property.acquisitionCostCents,
    loanBalanceCents: property.loanBalanceCents,
    loanBalanceDate: property.loanBalanceDate,
    loanInterestPercent: property.loanInterestPercent,
    monthlyPaymentCents: property.monthlyLoanPaymentCents,
  }));
}
