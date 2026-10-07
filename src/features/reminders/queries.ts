import { eq } from "drizzle-orm";

import { db } from "@/db";
import { leases, properties } from "@/db/schema";
import { findMissingDocuments } from "@/features/documents/required-documents";
import type { MonthlyCashflow } from "@/features/finance/types";
import { addMonths, diffYears, todayIso } from "@/lib/dates";

/** Frühestens nach so vielen Monaten mit unveränderter Miete kann nach § 558 BGB eine Erhöhung verlangt werden. */
export const RENT_INCREASE_MONTHS = 15;

/** Die Miete ist bis zum dritten Tag des Monats fällig; danach gilt sie als überfällig. */
const RENT_GRACE_DAYS = 3;

export type RentIncreaseReminder = {
  leaseId: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  startDate: string;
  monthsRunning: number;
  coldRentCents: number;
};

export type PaymentReminder = {
  key: string;
  propertyId: string;
  propertyName: string;
  /** Einheit, bei Posten ohne Einheit `null`. */
  unitNumber: string | null;
  label: string;
  amountCents: number;
  overdue: boolean;
  dueDate: string;
};

export type DocumentReminder = {
  propertyId: string;
  propertyName: string;
  missing: string[];
};

export type Reminders = {
  rentIncreases: RentIncreaseReminder[];
  payments: PaymentReminder[];
  documents: DocumentReminder[];
};

/**
 * Mieterhöhungs-Radar: laufende Wohnraum-Mietverträge, die seit mehr als 15 Monaten bestehen.
 * Die letzte Mieterhöhung ist nicht erfasst, daher dient der Mietbeginn als Näherung.
 * Gewerbe und Stellplätze fallen nicht unter § 558 BGB und werden ausgelassen.
 */
export async function getRentIncreaseReminders(today = todayIso()): Promise<RentIncreaseReminder[]> {
  const cutoff = addMonths(today, -RENT_INCREASE_MONTHS);
  const rows = await db.query.leases.findMany({
    where: eq(leases.isActive, true),
    with: { tenant: true, unit: { with: { property: true } } },
  });

  return rows
    .filter(
      (lease) =>
        lease.unit.type === "apartment" &&
        !lease.unit.property.isArchived &&
        lease.startDate < cutoff &&
        (lease.endDate === null || lease.endDate >= today),
    )
    .map<RentIncreaseReminder>((lease) => ({
      leaseId: lease.id,
      propertyId: lease.unit.propertyId,
      propertyName: lease.unit.property.name,
      unitNumber: lease.unit.unitNumber,
      tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`.trim(),
      startDate: lease.startDate,
      monthsRunning: Math.floor(diffYears(lease.startDate, today) * 12),
      coldRentCents: lease.unit.coldRentCents,
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Zahlungs-Mahnungen: offene Soll-Mieten des Monats und überfällige offene Posten. */
export function getPaymentReminders(cashflow: MonthlyCashflow, today = todayIso()): PaymentReminder[] {
  const rentOverdue = today > `${cashflow.yearMonth}-${String(RENT_GRACE_DAYS).padStart(2, "0")}`;

  const rent = cashflow.rentLines
    .filter((line) => line.status !== "paid")
    .map<PaymentReminder>((line) => ({
      key: `rent-${line.unitId}`,
      propertyId: line.propertyId,
      propertyName: line.propertyName,
      unitNumber: line.unitNumber,
      label: `Miete ${line.tenantName}${line.status === "partial" ? " (Teilzahlung)" : ""}`,
      amountCents: line.sollCents - line.paidCents,
      overdue: rentOverdue,
      dueDate: `${cashflow.yearMonth}-01`,
    }));

  const other = cashflow.openPayments
    .filter((item) => item.overdue)
    .map<PaymentReminder>((item) => ({
      key: `tx-${item.id}`,
      propertyId: item.propertyId,
      propertyName: item.propertyName,
      unitNumber: item.unitNumber,
      label: "Offener Posten",
      amountCents: item.amountCents,
      overdue: true,
      dueDate: item.dueDate,
    }));

  return [...rent, ...other].sort(
    (a, b) => Number(b.overdue) - Number(a.overdue) || a.dueDate.localeCompare(b.dueDate),
  );
}

/** Dokumenten-Check: Objekte, denen Pflichtunterlagen (Kaufvertrag, Grundbuch, Energieausweis) fehlen. */
export async function getDocumentReminders(): Promise<DocumentReminder[]> {
  const rows = await db.query.properties.findMany({
    where: eq(properties.isArchived, false),
    with: { documents: true },
  });

  return rows
    .map<DocumentReminder>((property) => ({
      propertyId: property.id,
      propertyName: property.name,
      missing: findMissingDocuments(property.documents),
    }))
    .filter((reminder) => reminder.missing.length > 0)
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName, "de"));
}

export async function getReminders(cashflow: MonthlyCashflow): Promise<Reminders> {
  const [rentIncreases, documents] = await Promise.all([
    getRentIncreaseReminders(),
    getDocumentReminders(),
  ]);
  return { rentIncreases, payments: getPaymentReminders(cashflow), documents };
}
