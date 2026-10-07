import { addYears, diffYears } from "@/lib/dates";

/** Grenze für anschaffungsnahe Herstellungskosten nach § 6 Abs. 1 Nr. 1a EStG. */
export const ACQUISITION_RELATED_LIMIT_PERCENT = 15;
/** Höchstsatz der Modernisierungsumlage nach § 559 BGB. */
const MODERNIZATION_LEVY_PERCENT = 8;

export type RenovationInput = {
  /** Summe aller Positionen netto (ohne Umsatzsteuer) in €. */
  netCosts: number;
  /** Bereits seit dem Kauf angefallene Instandsetzungs-/Modernisierungskosten netto in € (zählen zur 15-%-Grenze). */
  alreadySpentNet: number;
  vatPercent: number;
  /** Vorsteuer abziehbar: dann sind nur die Nettokosten wirtschaftlich belastend. */
  vatDeductible: boolean;
  /** Gesamt-Anschaffungskosten (Kaufpreis + Nebenkosten) in €. */
  acquisitionCost: number;
  /** Anteil des Gebäudes (ohne Grund und Boden) an den Anschaffungskosten in Prozent. */
  buildingSharePercent: number;
  /** Kaufdatum (ISO); `null`, wenn unbekannt. */
  purchaseDate: string | null;
  /** Geplanter Abschluss der Maßnahmen (ISO). */
  completionDate: string;
  /** Heutiges Datum (ISO). */
  today: string;
  areaSqm: number;
  currentColdRentMonthly: number;
  /** Erwartete Mietsteigerung durch die Sanierung in € pro m² und Monat. */
  rentIncreasePerSqm: number;
  /** Anteil der Kosten, der Modernisierung (und nicht reine Instandhaltung) ist, in Prozent. */
  modernizationSharePercent: number;
};

export type RenovationTaxStatus =
  | "ok"
  | "exceeded"
  /** Die Maßnahmen liegen nach der 3-Jahres-Frist: Die 15-%-Regel greift nicht. */
  | "not_applicable"
  | "no_basis";

export type RenovationResult = {
  netTotal: number;
  vatAmount: number;
  grossTotal: number;
  /** Tatsächliche Belastung: netto bei abziehbarer Vorsteuer, sonst brutto. */
  outlay: number;

  buildingCost: number;
  limit15: number;
  /** Netto-Kosten, die auf die Grenze angerechnet werden (bereits angefallene + geplante). */
  relevantNet: number;
  /** Auslastung der 15-%-Grenze in Prozent; `null` ohne Anschaffungskosten. */
  usagePercent: number | null;
  /** Verbleibender Spielraum bis zur Grenze (negativ = überschritten). */
  headroom: number;
  taxStatus: RenovationTaxStatus;
  /** Kaufdatum fehlt: Die Regel wird vorsichtshalber als anwendbar behandelt. */
  purchaseDateMissing: boolean;
  /** Ende der 3-Jahres-Frist (ISO); `null` ohne Kaufdatum. */
  fristEnd: string | null;
  /** Seit dem Kauf sind (bis heute) weniger als 3 Jahre vergangen; `null` ohne Kaufdatum. */
  withinFristToday: boolean | null;
  yearsSincePurchase: number | null;

  yieldBeforePercent: number | null;
  yieldAfterPercent: number | null;
  extraRentMonthly: number;
  paybackYears: number | null;
  /** Mehrmiete pro Jahr im Verhältnis zur Investition in Prozent. */
  returnOnRenovationPercent: number | null;
  /** Mögliche monatliche Mieterhöhung durch Modernisierungsumlage (8 %, mit Kappungsgrenze). */
  levyMonthly: number;
  levyCapMonthly: number | null;
};

/**
 * Sanierungsrechner mit Steuer-Check zu anschaffungsnahen Herstellungskosten
 * (§ 6 Abs. 1 Nr. 1a EStG): Übersteigen die Netto-Aufwendungen für Instandsetzung und
 * Modernisierung innerhalb von drei Jahren nach dem Kauf 15 % der Gebäudeanschaffungskosten,
 * müssen sie aktiviert und über die AfA verteilt werden, statt sofort als Werbungskosten
 * abziehbar zu sein. Plausibilitätsrechnung, keine Steuerberatung.
 */
export function calculateRenovation(input: RenovationInput): RenovationResult {
  const netTotal = input.netCosts;
  const vatAmount = netTotal * (input.vatPercent / 100);
  const grossTotal = netTotal + vatAmount;
  const outlay = input.vatDeductible ? netTotal : grossTotal;

  const buildingCost = input.acquisitionCost * (input.buildingSharePercent / 100);
  const limit15 = buildingCost * (ACQUISITION_RELATED_LIMIT_PERCENT / 100);
  const relevantNet = input.alreadySpentNet + netTotal;

  const fristEnd = input.purchaseDate ? addYears(input.purchaseDate, 3) : null;
  const purchaseDateMissing = input.purchaseDate === null;
  const completionInFrist = fristEnd === null || input.completionDate <= fristEnd;

  let taxStatus: RenovationTaxStatus;
  if (!completionInFrist) taxStatus = "not_applicable";
  else if (limit15 <= 0) taxStatus = "no_basis";
  else taxStatus = relevantNet > limit15 ? "exceeded" : "ok";

  const annualRent = input.currentColdRentMonthly * 12;
  const extraRentMonthly = input.rentIncreasePerSqm * input.areaSqm;
  const extraRentYearly = extraRentMonthly * 12;

  const levyMonthlyUncapped =
    (outlay * (input.modernizationSharePercent / 100) * (MODERNIZATION_LEVY_PERCENT / 100)) / 12;
  const currentRentPerSqm = input.areaSqm > 0 ? input.currentColdRentMonthly / input.areaSqm : null;
  // Kappungsgrenze: 3 €/m² innerhalb von 6 Jahren, bei Mieten unter 7 €/m² nur 2 €/m².
  const levyCapPerSqm = currentRentPerSqm !== null && currentRentPerSqm < 7 ? 2 : 3;
  const levyCapMonthly = input.areaSqm > 0 ? levyCapPerSqm * input.areaSqm : null;

  return {
    netTotal,
    vatAmount,
    grossTotal,
    outlay,
    buildingCost,
    limit15,
    relevantNet,
    usagePercent: limit15 > 0 ? (relevantNet / limit15) * 100 : null,
    headroom: limit15 - relevantNet,
    taxStatus,
    purchaseDateMissing,
    fristEnd,
    withinFristToday: fristEnd === null ? null : input.today <= fristEnd,
    yearsSincePurchase: input.purchaseDate ? diffYears(input.purchaseDate, input.today) : null,
    yieldBeforePercent:
      input.acquisitionCost > 0 && annualRent > 0 ? (annualRent / input.acquisitionCost) * 100 : null,
    yieldAfterPercent:
      input.acquisitionCost + outlay > 0 && annualRent + extraRentYearly > 0
        ? ((annualRent + extraRentYearly) / (input.acquisitionCost + outlay)) * 100
        : null,
    extraRentMonthly,
    paybackYears: extraRentYearly > 0 && outlay > 0 ? outlay / extraRentYearly : null,
    returnOnRenovationPercent: outlay > 0 && extraRentYearly > 0 ? (extraRentYearly / outlay) * 100 : null,
    levyMonthly:
      levyCapMonthly === null ? levyMonthlyUncapped : Math.min(levyMonthlyUncapped, levyCapMonthly),
    levyCapMonthly,
  };
}
