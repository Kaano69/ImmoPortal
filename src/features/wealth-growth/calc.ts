import { remainingDebtAfter } from "@/features/property-sale/calc";
import { diffYears } from "@/lib/dates";

export type WealthProperty = {
  id: string;
  name: string;
  marketValueCents: number | null;
  loanBalanceCents: number | null;
  loanBalanceDate: string | null;
  loanInterestPercent: number | null;
  monthlyLoanPaymentCents: number | null;
};

export type WealthSnapshot = {
  propertyCount: number;
  totalValueCents: number;
  /** Restschuld, fortgeschrieben bis `today`. */
  totalDebtCents: number;
  equityCents: number;
  /** Eigenkapitalquote in Prozent (0–100); 0, wenn kein Wert bekannt ist. */
  equityRatioPercent: number;
  /** Monatliche Tilgungsleistung (Annuität minus Zinsanteil) aller Objekte mit Darlehensdaten, Stand heute. */
  monthlyPrincipalCents: number;
};

export type WealthProjectionPoint = {
  years: number;
  valueCents: number;
  debtCents: number;
  equityCents: number;
  /** Zuwachs gegenüber dem heutigen Eigenkapital. */
  equityGrowthCents: number;
};

/** Restschuld eines Objekts, fortgeschrieben vom Stichtag auf `today` (niemals negativ). */
export function debtTodayCents(property: WealthProperty, today: string): number {
  if (property.loanBalanceCents === null) return 0;
  const balanceDate = property.loanBalanceDate ?? today;
  const months = Math.max(0, diffYears(balanceDate, today) * 12);
  return Math.round(
    remainingDebtAfter(
      property.loanBalanceCents / 100,
      property.loanInterestPercent ?? 0,
      (property.monthlyLoanPaymentCents ?? 0) / 100,
      months,
    ) * 100,
  );
}

/**
 * Monatliche Tilgungsleistung heute: Monatsrate minus Zinsanteil auf die heutige Restschuld.
 * Ohne Monatsrate oder Darlehensdaten ist die Tilgung 0 (kein Konto wird kleiner geschätzt, als es ist).
 */
export function monthlyPrincipalCents(property: WealthProperty, today: string): number {
  const payment = property.monthlyLoanPaymentCents ?? 0;
  if (payment <= 0) return 0;
  const balance = debtTodayCents(property, today);
  const monthlyInterest = balance * ((property.loanInterestPercent ?? 0) / 100 / 12);
  return Math.max(0, Math.round(payment - monthlyInterest));
}

export function getWealthSnapshot(properties: WealthProperty[], today: string): WealthSnapshot {
  let totalValueCents = 0;
  let totalDebtCents = 0;
  let monthlyPrincipal = 0;

  for (const property of properties) {
    totalValueCents += property.marketValueCents ?? 0;
    totalDebtCents += debtTodayCents(property, today);
    monthlyPrincipal += monthlyPrincipalCents(property, today);
  }

  const equityCents = totalValueCents - totalDebtCents;
  return {
    propertyCount: properties.length,
    totalValueCents,
    totalDebtCents,
    equityCents,
    equityRatioPercent: totalValueCents === 0 ? 0 : (equityCents / totalValueCents) * 100,
    monthlyPrincipalCents: monthlyPrincipal,
  };
}

/**
 * Prognose des Nettovermögens über mehrere Zeithorizonte:
 *   Wert(t)   = Marktwert heute × (1 + Wertsteigerung)^t
 *   Schuld(t) = Restschuld heute, fortgeschrieben um t Jahre bei konstanter Annuitätenrate
 *   Eigenkapital(t) = Wert(t) − Schuld(t)
 */
export function projectWealth(
  properties: WealthProperty[],
  { horizonsYears, appreciationPercent, today }: {
    horizonsYears: readonly number[];
    appreciationPercent: number;
    today: string;
  },
): WealthProjectionPoint[] {
  const snapshot = getWealthSnapshot(properties, today);

  return horizonsYears.map((years) => {
    let valueCents = 0;
    let debtCents = 0;

    for (const property of properties) {
      const valueToday = property.marketValueCents ?? 0;
      valueCents += Math.round(valueToday * (1 + appreciationPercent / 100) ** years);

      const debtToday = debtTodayCents(property, today);
      debtCents += Math.round(
        remainingDebtAfter(
          debtToday / 100,
          property.loanInterestPercent ?? 0,
          (property.monthlyLoanPaymentCents ?? 0) / 100,
          years * 12,
        ) * 100,
      );
    }

    const equityCents = valueCents - debtCents;
    return {
      years,
      valueCents,
      debtCents,
      equityCents,
      equityGrowthCents: equityCents - snapshot.equityCents,
    };
  });
}
