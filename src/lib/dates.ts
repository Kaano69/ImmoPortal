export const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Heutiges Datum (lokale Zeit) als `YYYY-MM-DD`. */
export function todayIso(): string {
  return new Date().toLocaleDateString("sv-SE");
}

/** Aktueller Monat als `YYYY-MM`. */
export function currentYearMonth(): string {
  return todayIso().slice(0, 7);
}

export function isYearMonth(value: string): boolean {
  return YEAR_MONTH_PATTERN.test(value);
}

/** Erster und letzter Tag eines Monats (`YYYY-MM`) als ISO-Datum. */
export function monthBounds(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${yearMonth}-01`,
    end: `${yearMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Verschiebt einen Monat (`YYYY-MM`) um `delta` Monate. */
export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7);
}
