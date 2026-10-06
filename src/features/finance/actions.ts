"use server";

import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { TRANSACTION_TYPES, transactions, units } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import {
  currentYearMonth,
  isYearMonth,
  monthBounds,
  todayIso,
} from "@/lib/dates";
import {
  errorState,
  isoDate,
  optionalText,
  parseForm,
  requiredEuroCents,
} from "@/lib/form-state";

import {
  TRANSACTION_FIELDS,
  type MonthlyCashflow,
  type PaymentItem,
  type RentLine,
  type TransactionFormState,
} from "./types";

// Beträge werden immer positiv in Cent gespeichert; die Richtung (Einnahme/Ausgabe)
// ergibt sich aus dem Typ: `rent_incoming` ist eine Einnahme, alle anderen sind Ausgaben.

function revalidateFinance(propertyId: string): void {
  revalidatePath("/");
  revalidatePath(`/properties/${propertyId}`);
}

type Bounds = { start: string; end: string };

function leaseCoversMonth(
  lease: { startDate: string; endDate: string | null },
  bounds: Bounds,
): boolean {
  return (
    lease.startDate <= bounds.end &&
    (lease.endDate === null || lease.endDate >= bounds.start)
  );
}

const inMonth = (date: string, bounds: Bounds): boolean =>
  date >= bounds.start && date <= bounds.end;

// ---------------------------------------------------------------------------
// Zahlung erfassen
// ---------------------------------------------------------------------------

const transactionSchema = z.object({
  unitId: optionalText(64),
  type: z.enum(TRANSACTION_TYPES, { error: "Bitte einen Typ wählen." }),
  amount: requiredEuroCents(
    "Bitte einen Betrag angeben.",
    "Bitte einen gültigen Betrag angeben.",
  ).refine((cents) => cents > 0, "Der Betrag muss größer als 0 sein."),
  dueDate: isoDate("Bitte ein gültiges Fälligkeitsdatum angeben."),
  paidAt: z.preprocess(
    (value) => (value === "" ? undefined : value),
    isoDate("Bitte ein gültiges Bezahldatum angeben.").optional(),
  ),
});

/** Erfasst eine Zahlung oder Ausgabe; ohne Bezahldatum bleibt sie als offener Posten bestehen. */
export async function recordTransactionAction(
  _previousState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const parsed = parseForm(transactionSchema, TRANSACTION_FIELDS, formData);
  if (!parsed.ok) return parsed.state;
  const { data, values } = parsed;

  const propertyId = formData.get("propertyId");
  if (typeof propertyId !== "string" || propertyId === "") {
    return errorState("Die Immobilie wurde nicht gefunden.", values);
  }

  if (data.unitId) {
    const unit = db.select().from(units).where(eq(units.id, data.unitId)).get();
    if (!unit || unit.propertyId !== propertyId) {
      return errorState("Bitte prüfe deine Eingaben.", values, {
        unitId: "Die Einheit gehört nicht zu diesem Objekt.",
      });
    }
  }

  try {
    db.insert(transactions)
      .values({
        propertyId,
        unitId: data.unitId ?? null,
        amountCents: data.amount,
        type: data.type,
        dueDate: data.dueDate,
        paidAt: data.paidAt ?? null,
      })
      .run();
  } catch (error) {
    console.error("Buchung konnte nicht gespeichert werden:", error);
    return errorState("Die Buchung konnte nicht gespeichert werden. Existiert das Objekt noch?", values);
  }

  revalidateFinance(propertyId);
  return { status: "success" };
}

// ---------------------------------------------------------------------------
// Zahlungsstatus ändern
// ---------------------------------------------------------------------------

const idSchema = z.string().min(1);
const yearMonthSchema = z.string().refine(isYearMonth);

/**
 * Markiert die Soll-Miete einer Einheit für den Monat als bezahlt. Eine bereits
 * erfasste, noch offene Mietbuchung wird auf „bezahlt“ gesetzt, sonst wird der
 * noch fehlende Betrag als bezahlte Buchung angelegt.
 */
export async function markRentPaidAction(
  unitId: string,
  yearMonth: string,
): Promise<ActionResult> {
  const parsedUnitId = idSchema.safeParse(unitId);
  const parsedMonth = yearMonthSchema.safeParse(yearMonth);
  if (!parsedUnitId.success || !parsedMonth.success) {
    return { success: false, error: "Ungültige Eingabe." };
  }

  const bounds = monthBounds(parsedMonth.data);
  const unit = await db.query.units.findFirst({
    where: eq(units.id, parsedUnitId.data),
    with: { leases: true },
  });
  if (!unit || !unit.leases.some((lease) => leaseCoversMonth(lease, bounds))) {
    return { success: false, error: "Für diesen Monat gibt es kein Mietverhältnis." };
  }

  const today = todayIso();
  const sollCents = unit.coldRentCents + unit.additionalCostsCents;

  try {
    db.transaction((tx) => {
      const rentRows = tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.unitId, unit.id),
            eq(transactions.type, "rent_incoming"),
            gte(transactions.dueDate, bounds.start),
            lte(transactions.dueDate, bounds.end),
          ),
        )
        .all();

      const openRow = rentRows.find((row) => row.paidAt === null);
      if (openRow) {
        tx.update(transactions)
          .set({ paidAt: today })
          .where(eq(transactions.id, openRow.id))
          .run();
        return;
      }

      const paidCents = rentRows.reduce((sum, row) => sum + row.amountCents, 0);
      const remaining = sollCents - paidCents;
      if (remaining <= 0) return;

      tx.insert(transactions)
        .values({
          propertyId: unit.propertyId,
          unitId: unit.id,
          amountCents: remaining,
          type: "rent_incoming",
          dueDate: bounds.start,
          paidAt: today,
        })
        .run();
    });
  } catch (error) {
    console.error("Mietzahlung konnte nicht verbucht werden:", error);
    return { success: false, error: "Die Zahlung konnte nicht gespeichert werden." };
  }

  revalidateFinance(unit.propertyId);
  return { success: true };
}

/** Markiert einen offenen Posten als heute bezahlt. */
export async function markTransactionPaidAction(
  transactionId: string,
): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(transactionId);
  if (!parsedId.success) return { success: false, error: "Ungültige Buchungs-ID." };

  const updated = db
    .update(transactions)
    .set({ paidAt: todayIso() })
    .where(and(eq(transactions.id, parsedId.data), isNull(transactions.paidAt)))
    .returning({ propertyId: transactions.propertyId })
    .all();
  if (updated.length === 0) {
    return { success: false, error: "Die Buchung wurde nicht gefunden oder ist bereits bezahlt." };
  }

  revalidateFinance(updated[0].propertyId);
  return { success: true };
}

/** Löscht eine Buchung, z. B. eine versehentlich erfasste Zahlung. */
export async function deleteTransactionAction(
  transactionId: string,
): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(transactionId);
  if (!parsedId.success) return { success: false, error: "Ungültige Buchungs-ID." };

  const deleted = db
    .delete(transactions)
    .where(eq(transactions.id, parsedId.data))
    .returning({ propertyId: transactions.propertyId })
    .all();
  if (deleted.length === 0) return { success: false, error: "Die Buchung wurde nicht gefunden." };

  revalidateFinance(deleted[0].propertyId);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Cashflow
// ---------------------------------------------------------------------------

/**
 * Berechnet Soll-Mieten gegen Ist-Eingänge für einen Monat (Standard: aktueller Monat),
 * optional für ein einzelnes Objekt, und listet offene Zahlungen auf.
 *
 * Soll-Mieten werden aus den Mietverträgen abgeleitet (Warmmiete der Einheit) und nicht
 * als Buchungen vorgehalten; erst eine erfasste Zahlung erzeugt eine Buchung.
 * Wird die Miete einer Einheit später geändert, gilt der neue Betrag auch für
 * zurückliegende Monate.
 */
export async function getMonthlyCashflow(
  propertyId?: string,
  yearMonth?: string,
): Promise<MonthlyCashflow> {
  const month = yearMonth ?? currentYearMonth();
  if (!isYearMonth(month)) throw new Error("Ungültiger Monat (erwartet: YYYY-MM).");
  const bounds = monthBounds(month);
  const today = todayIso();

  const unitRows = await db.query.units.findMany({
    where: propertyId ? eq(units.propertyId, propertyId) : undefined,
    with: { property: true, leases: { with: { tenant: true } } },
  });

  const transactionRows = await db.query.transactions.findMany({
    where: and(
      propertyId ? eq(transactions.propertyId, propertyId) : undefined,
      or(
        and(gte(transactions.dueDate, bounds.start), lte(transactions.dueDate, bounds.end)),
        and(isNull(transactions.paidAt), lte(transactions.dueDate, bounds.end)),
      ),
    ),
    with: { unit: true, property: true },
    orderBy: [asc(transactions.dueDate)],
  });

  const rentLines: RentLine[] = [];
  const unitsWithLine = new Set<string>();

  for (const unit of unitRows) {
    const lease = unit.leases
      .filter((candidate) => leaseCoversMonth(candidate, bounds))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    if (!lease) continue;

    unitsWithLine.add(unit.id);
    const sollCents = unit.coldRentCents + unit.additionalCostsCents;
    const payments = transactionRows
      .filter(
        (row) =>
          row.type === "rent_incoming" &&
          row.unitId === unit.id &&
          row.paidAt !== null &&
          inMonth(row.dueDate, bounds),
      )
      .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
    const paidCents = payments.reduce((sum, row) => sum + row.amountCents, 0);

    rentLines.push({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      propertyId: unit.propertyId,
      propertyName: unit.property.name,
      tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`.trim(),
      sollCents,
      paidCents,
      status: paidCents >= sollCents ? "paid" : paidCents > 0 ? "partial" : "open",
      lastPaymentId: payments[0]?.id ?? null,
      lastPaidAt: payments[0]?.paidAt ?? null,
    });
  }
  rentLines.sort(
    (a, b) =>
      a.propertyName.localeCompare(b.propertyName, "de") ||
      a.unitNumber.localeCompare(b.unitNumber, "de", { numeric: true }),
  );

  const toItem = (row: (typeof transactionRows)[number]): PaymentItem => ({
    id: row.id,
    propertyId: row.propertyId,
    propertyName: row.property.name,
    unitNumber: row.unit?.unitNumber ?? null,
    type: row.type,
    amountCents: row.amountCents,
    dueDate: row.dueDate,
    paidAt: row.paidAt,
    overdue: row.paidAt === null && row.dueDate < today,
  });

  const isMonthRentOfLine = (row: (typeof transactionRows)[number]): boolean =>
    row.type === "rent_incoming" &&
    row.unitId !== null &&
    unitsWithLine.has(row.unitId) &&
    inMonth(row.dueDate, bounds);

  const sollCents = rentLines.reduce((sum, line) => sum + line.sollCents, 0);
  const istCents = transactionRows
    .filter(
      (row) => row.type === "rent_incoming" && row.paidAt !== null && inMonth(row.dueDate, bounds),
    )
    .reduce((sum, row) => sum + row.amountCents, 0);
  const expenseRows = transactionRows.filter(
    (row) => row.type !== "rent_incoming" && inMonth(row.dueDate, bounds),
  );

  return {
    yearMonth: month,
    sollCents,
    istCents,
    openRentCents: rentLines.reduce(
      (sum, line) => sum + Math.max(0, line.sollCents - line.paidCents),
      0,
    ),
    expensesPaidCents: expenseRows
      .filter((row) => row.paidAt !== null)
      .reduce((sum, row) => sum + row.amountCents, 0),
    rentLines,
    openPayments: transactionRows
      .filter((row) => row.paidAt === null && !isMonthRentOfLine(row))
      .map(toItem),
    expenses: expenseRows.map(toItem),
  };
}
