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

const MS_PER_DAY = 86_400_000;
export const DAYS_PER_YEAR = 365.25;

function toUtc(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Addiert Tage zu einem ISO-Datum. */
export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + Math.round(days) * MS_PER_DAY);
}

/** Addiert ganze Jahre (gleicher Monat und Tag), z. B. für die 10-Jahres-Frist. */
export function addYears(date: string, years: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return fromUtc(Date.UTC(year + years, month - 1, day));
}

/** Addiert ganze Monate; der Tag wird auf den Monatsletzten begrenzt (31.01. + 1 Monat = 28./29.02.). */
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return fromUtc(Date.UTC(year, month - 1 + months, Math.min(day, lastDay)));
}

/** Differenz `to - from` in Jahren (365,25 Tage pro Jahr); negativ, wenn `to` vor `from` liegt. */
export function diffYears(from: string, to: string): number {
  return (toUtc(to) - toUtc(from)) / MS_PER_DAY / DAYS_PER_YEAR;
}
