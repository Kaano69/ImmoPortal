import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { properties } from "@/db/schema";

import type { WealthProperty } from "./calc";

/** Objekte mit den für die Vermögensberechnung relevanten Feldern (ohne archivierte Objekte). */
export async function getWealthProperties(): Promise<WealthProperty[]> {
  const rows = await db
    .select()
    .from(properties)
    .where(eq(properties.isArchived, false))
    .orderBy(asc(properties.name));

  return rows.map((property) => ({
    id: property.id,
    name: property.name,
    marketValueCents: property.marketValueCents,
    loanBalanceCents: property.loanBalanceCents,
    loanBalanceDate: property.loanBalanceDate,
    loanInterestPercent: property.loanInterestPercent,
    monthlyLoanPaymentCents: property.monthlyLoanPaymentCents,
  }));
}
