import type { TransactionType } from "@/db/schema";
import type { FormState } from "@/lib/form-state";

export const TRANSACTION_FIELDS = [
  "unitId",
  "type",
  "amount",
  "dueDate",
  "paidAt",
] as const;

export type TransactionField = (typeof TRANSACTION_FIELDS)[number];
export type TransactionFormState = FormState<TransactionField>;

export type RentLineStatus = "paid" | "partial" | "open";

/** Soll-Miete (Kalt- plus Nebenkosten) einer Einheit für den betrachteten Monat. */
export type RentLine = {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  sollCents: number;
  paidCents: number;
  status: RentLineStatus;
  /** Letzte erfasste Zahlung dieses Monats (zum Zurücknehmen). */
  lastPaymentId: string | null;
  lastPaidAt: string | null;
};

export type PaymentItem = {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string | null;
  type: TransactionType;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  overdue: boolean;
};

export type MonthlyCashflow = {
  yearMonth: string;
  /** Soll-Einnahmen: Warmmieten aller Einheiten mit Mietvertrag in diesem Monat. */
  sollCents: number;
  /** Ist-Einnahmen: bezahlte Mieteingänge (inkl. Sonderzahlungen) mit Fälligkeit in diesem Monat. */
  istCents: number;
  /** Noch offener Teil der Soll-Mieten dieses Monats. */
  openRentCents: number;
  /** Bezahlte Ausgaben (Instandhaltung, Nebenkosten) mit Fälligkeit in diesem Monat. */
  expensesPaidCents: number;
  rentLines: RentLine[];
  /** Offene Posten bis Monatsende außerhalb der Soll-Mieten dieses Monats (Ausgaben, Altposten). */
  openPayments: PaymentItem[];
  /** Alle Ausgaben mit Fälligkeit in diesem Monat (bezahlt und offen). */
  expenses: PaymentItem[];
};
