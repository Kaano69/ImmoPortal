import { addDays, addYears, DAYS_PER_YEAR, diffYears } from "@/lib/dates";

export type SaleInput = {
  /** Marktwert heute in €. */
  marketValue: number;
  /** Jährliche Wertsteigerung in Prozent. */
  appreciationPercent: number;
  /** Verkauf in dieser Anzahl Jahren ab `today`. */
  yearsFromToday: number;
  /** Verkaufskosten (Makler, Notar, Abschlag) in Prozent des Verkaufswerts. */
  saleCostPercent: number;
  /** Bereinigte Anschaffungskosten (Kaufpreis + Nebenkosten + Renovierung) in €. */
  adjustedAcquisitionCost: number;
  /** Weitere wertrelevante Kosten in €. */
  otherCosts: number;
  /** Bis zum Verkauf kumulierte AfA in € (mindert die steuerliche Kostenbasis). */
  accumulatedDepreciation: number;
  /** Persönlicher Steuersatz in Prozent. */
  taxRatePercent: number;
  loanBalance: number;
  /** Stichtag der Restschuld (ISO); ohne Angabe gilt `today`. */
  loanBalanceDate: string | null;
  loanInterestPercent: number;
  monthlyPayment: number;
  /** Kaufdatum (ISO); `null`, wenn unbekannt. */
  purchaseDate: string | null;
  /** Heutiges Datum (ISO). */
  today: string;
  selfUse: {
    enabled: boolean;
    /** Beginn der Eigennutzung (ISO). */
    since: string | null;
    /** Nutzung zu eigenen Wohnzwecken lückenlos bis zum Verkauf. */
    continuous: boolean;
  };
};

export type TaxStatus = "free_10_years" | "free_self_use" | "taxable" | "unknown";

export type SaleResult = {
  saleDate: string;
  saleValue: number;
  saleCosts: number;
  remainingDebt: number;
  /** Geldfluss auf das Konto nach Kosten, Restschuld und Steuer. */
  netPayout: number;
  /** Verkaufswert − Verkaufskosten − bereinigte Anschaffungskosten (ohne Finanzierung, ohne Steuer). */
  economicGainBeforeTax: number;
  economicGainAfterTax: number;
  /** Steuerpflichtiger Gewinn nach § 23 EStG (Kostenbasis abzüglich AfA); unabhängig vom Status. */
  taxableGain: number;
  tax: number;
  taxStatus: TaxStatus;
  /** Ende der 10-Jahres-Frist (ISO); `null` ohne Kaufdatum. */
  tenYearDate: string | null;
  /** Erster steuerfreier Verkaufstag nach Ablauf der Frist (ISO). */
  earliestTaxFreeSaleDate: string | null;
  /** Haltedauer vom Kauf bis zum Verkauf in Jahren. */
  holdingYears: number | null;
};

/**
 * Restschuld nach `months` Monaten bei konstanter Annuitätenrate (stetige Monatszählung).
 * Ohne Rate bleibt die Schuld unverändert; sie sinkt nie unter 0.
 */
export function remainingDebtAfter(
  balance: number,
  annualInterestPercent: number,
  monthlyPayment: number,
  months: number,
): number {
  if (months <= 0 || monthlyPayment <= 0) return Math.max(0, balance);
  const monthlyRate = annualInterestPercent / 100 / 12;
  if (monthlyRate === 0) return Math.max(0, balance - monthlyPayment * months);
  const growth = (1 + monthlyRate) ** months;
  return Math.max(0, balance * growth - (monthlyPayment * (growth - 1)) / monthlyRate);
}

/**
 * Verkaufs- & Exit-Rechner (Logik des Excel-Blatts „Wert & Verkauf“):
 *
 *   Verkaufswert        = Marktwert × (1 + Wertsteigerung)^Jahre
 *   Verkaufskosten      = Verkaufswert × Kostensatz
 *   Netto-Auszahlung    = Verkaufswert − Verkaufskosten − Restschuld − Steuer
 *   Wirtschaftl. Gewinn = Verkaufswert − Verkaufskosten − bereinigte Anschaffungskosten
 *
 * Steuer (§ 23 Abs. 1 Nr. 1 EStG): Der Gewinn ist steuerfrei, wenn zwischen Kauf und
 * Verkauf mehr als 10 Jahre liegen oder die Immobilie zu eigenen Wohnzwecken genutzt wurde
 * (seit dem Kauf oder im Jahr des Verkaufs und den beiden Vorjahren, lückenlos).
 * Bei unbekanntem Kaufdatum wird vorsichtig mit Steuerpflicht gerechnet.
 * Eine Plausibilitätsrechnung, keine Steuerberatung.
 */
export function calculateSale(input: SaleInput): SaleResult {
  const saleDate = addDays(input.today, input.yearsFromToday * DAYS_PER_YEAR);
  const saleValue =
    input.marketValue * (1 + input.appreciationPercent / 100) ** input.yearsFromToday;
  const saleCosts = saleValue * (input.saleCostPercent / 100);

  const balanceDate = input.loanBalanceDate ?? input.today;
  const monthsSinceBalance = diffYears(balanceDate, saleDate) * 12;
  const remainingDebt = remainingDebtAfter(
    input.loanBalance,
    input.loanInterestPercent,
    input.monthlyPayment,
    monthsSinceBalance,
  );

  const costBasis = input.adjustedAcquisitionCost + input.otherCosts;
  const economicGainBeforeTax = saleValue - saleCosts - costBasis;
  const taxableGain = saleValue - saleCosts - (costBasis - input.accumulatedDepreciation);

  const tenYearDate = input.purchaseDate ? addYears(input.purchaseDate, 10) : null;
  const saleYear = Number(saleDate.slice(0, 4));
  const { selfUse, purchaseDate } = input;
  const selfUseExempt =
    selfUse.enabled &&
    selfUse.continuous &&
    selfUse.since !== null &&
    (selfUse.since <= `${saleYear - 2}-12-31` ||
      (purchaseDate !== null && selfUse.since <= purchaseDate));

  let taxStatus: TaxStatus;
  if (tenYearDate !== null && saleDate > tenYearDate) taxStatus = "free_10_years";
  else if (selfUseExempt) taxStatus = "free_self_use";
  else if (tenYearDate === null) taxStatus = "unknown";
  else taxStatus = "taxable";

  const tax =
    taxStatus === "free_10_years" || taxStatus === "free_self_use"
      ? 0
      : Math.max(0, taxableGain) * (input.taxRatePercent / 100);

  return {
    saleDate,
    saleValue,
    saleCosts,
    remainingDebt,
    netPayout: saleValue - saleCosts - remainingDebt - tax,
    economicGainBeforeTax,
    economicGainAfterTax: economicGainBeforeTax - tax,
    taxableGain,
    tax,
    taxStatus,
    tenYearDate,
    earliestTaxFreeSaleDate: tenYearDate ? addDays(tenYearDate, 1) : null,
    holdingYears: purchaseDate ? diffYears(purchaseDate, saleDate) : null,
  };
}
