import type { DepositStatus, DocumentCategory, TransactionType, UnitType } from "@/db/schema";

// Nur Typ-Import: diese Datei wird auch in Client-Komponenten verwendet.

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  apartment: "Wohnung",
  commercial: "Gewerbe",
  parking: "Stellplatz",
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  "01_kauf_eigentum": "01 Kauf & Eigentum",
  "02_finanzierung": "02 Finanzierung",
  "03_versicherungen": "03 Versicherungen",
  "04_steuern_behoerden": "04 Steuern & Behörden",
  "05_versorger": "05 Versorger",
  "06_kosten_rechnungen": "06 Kosten & Rechnungen",
  "07_instandhaltung_sanierung": "07 Instandhaltung & Sanierung",
  "08_nebenkosten": "08 Nebenkosten",
  "09_mietvertraege_mieter": "09 Mietverträge & Mieter",
  "10_mietrecht_mahnungen": "10 Mietrecht & Mahnungen",
  sonstiges: "Sonstiges",
};

/** Typische Inhalte je Kategorie (als Orientierung bei der Auswahl). */
export const DOCUMENT_CATEGORY_HINTS: Record<DocumentCategory, string> = {
  "01_kauf_eigentum": "Kaufvertrag, Grundbuch, Notar, Grundrisse, Energieausweis",
  "02_finanzierung": "Darlehensverträge, Grundschuld, Tilgungspläne",
  "03_versicherungen": "Gebäudeversicherung, Haftpflicht, Schadensfälle",
  "04_steuern_behoerden": "Grundsteuer, Finanzamt, Bescheide",
  "05_versorger": "Strom, Gas, Wasser, Müll, Schornsteinfeger",
  "06_kosten_rechnungen": "Handwerker, allgemeine Rechnungen",
  "07_instandhaltung_sanierung": "Angebote, Sanierungsmaßnahmen",
  "08_nebenkosten": "Abrechnungen, Belege, Zählerstände",
  "09_mietvertraege_mieter": "Mietverträge, Übergaben, Kautionsnachweise",
  "10_mietrecht_mahnungen": "Mahnungen, Kündigungen, Anwalt",
  sonstiges: "Alles, was nirgends sonst passt",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  rent_incoming: "Mieteingang / Sonderzahlung",
  maintenance: "Instandhaltung",
  utility_cost: "Betriebs-/Nebenkosten",
};

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  missing: "Keine Kaution hinterlegt",
  received: "Erhalten (Bar/Überweisung)",
  bank_deposit: "Kautionskonto angelegt",
  guarantee: "Kautionsbürgschaft",
};
