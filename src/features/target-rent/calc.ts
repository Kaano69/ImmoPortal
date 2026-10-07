export type TargetRentInput = {
  /** Darlehensrate in € pro Monat. */
  loanPaymentMonthly: number;
  /** Nicht umlegbare Kosten in € pro Jahr (inkl. abzuführender Umsatzsteuer). */
  annualCosts: number;
  /** Instandhaltungsrücklage in € pro Jahr (gesamt; z. B. €/m² × Fläche). */
  maintenanceReserveYearly: number;
  /** Fläche in m² (nur für die Miete pro m²). */
  areaSqm: number;
  /** Gewünschter Überschuss in € pro Monat. */
  desiredSurplusMonthly: number;
  /** Kalkulierter Leerstand in Prozent (0 bis unter 100). */
  vacancyPercent: number;
  /** Einnahmen aus Nebenkosten und Umsatzsteuer in € pro Monat. */
  additionalIncomeMonthly: number;
  /** Geplante bzw. aktuelle Kaltmiete in € pro Monat (optional). */
  plannedColdRentMonthly: number | null;
  /** Kaufpreis bzw. Marktwert in € (optional, nur für die Bruttorendite). */
  purchasePrice: number | null;
};

export type TargetRentResult = {
  loanYearly: number;
  maintenanceReserveYearly: number;
  requiredColdRentYearly: number;
  requiredColdRentMonthly: number;
  /** `null`, wenn keine Fläche angegeben ist. */
  requiredColdRentPerSqm: number | null;
  /** Monatlicher Netto-Cashflow nach Rücklagen bei der geplanten Kaltmiete; `null` ohne Planmiete. */
  plannedCashflowMonthly: number | null;
  /** Geplante minus erforderliche Kaltmiete pro Monat (negativ = Mietlücke); `null` ohne Planmiete. */
  rentSurplusMonthly: number | null;
  /** Erforderliche Jahreskaltmiete im Verhältnis zum Kaufpreis in Prozent; `null` ohne Kaufpreis. */
  grossYieldPercent: number | null;
};

/**
 * Zielmieten-Rechner (Logik des Excel-Blatts „Zielmiete“):
 *
 *   erforderliche Kaltmiete p.a. =
 *     (Darlehen p.a. + Kosten p.a. + Instandhaltungsrücklage p.a + Überschuss p.a. − NK/USt-Einnahmen p.a.)
 *     ÷ (1 − Leerstandsquote)
 *
 * Der Cashflow nach Rücklagen ergibt sich analog:
 *   (Kaltmiete p.a. × (1 − Leerstandsquote) + NK/USt p.a. − Darlehen p.a. − Kosten p.a. − Rücklage p.a.) ÷ 12
 */
export function calculateTargetRent(input: TargetRentInput): TargetRentResult {
  const vacancy = input.vacancyPercent / 100;
  if (!(vacancy >= 0 && vacancy < 1)) {
    throw new RangeError("Der Leerstand muss zwischen 0 % und unter 100 % liegen.");
  }

  const loanYearly = input.loanPaymentMonthly * 12;
  const maintenanceReserveYearly = input.maintenanceReserveYearly;
  const additionalIncomeYearly = input.additionalIncomeMonthly * 12;
  const desiredSurplusYearly = input.desiredSurplusMonthly * 12;

  const requiredColdRentYearly =
    (loanYearly +
      input.annualCosts +
      maintenanceReserveYearly +
      desiredSurplusYearly -
      additionalIncomeYearly) /
    (1 - vacancy);
  const requiredColdRentMonthly = requiredColdRentYearly / 12;

  const planned = input.plannedColdRentMonthly;
  return {
    loanYearly,
    maintenanceReserveYearly,
    requiredColdRentYearly,
    requiredColdRentMonthly,
    requiredColdRentPerSqm: input.areaSqm > 0 ? requiredColdRentMonthly / input.areaSqm : null,
    plannedCashflowMonthly:
      planned === null
        ? null
        : (planned * 12 * (1 - vacancy) +
            additionalIncomeYearly -
            loanYearly -
            input.annualCosts -
            maintenanceReserveYearly) /
          12,
    rentSurplusMonthly: planned === null ? null : planned - requiredColdRentMonthly,
    grossYieldPercent:
      input.purchasePrice !== null && input.purchasePrice > 0
        ? (requiredColdRentYearly / input.purchasePrice) * 100
        : null,
  };
}
