import type { DocumentCategory, TransactionType, UnitType } from "@/db/schema";

// Nur Typ-Import: diese Datei wird auch in Client-Komponenten verwendet.

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  apartment: "Wohnung",
  commercial: "Gewerbe",
  parking: "Stellplatz",
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contract: "Mietvertrag",
  invoice: "Rechnung",
  protocol: "Übergabeprotokoll",
  other: "Sonstiges",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  rent_incoming: "Mieteingang / Sonderzahlung",
  maintenance: "Instandhaltung",
  utility_cost: "Betriebs-/Nebenkosten",
};
