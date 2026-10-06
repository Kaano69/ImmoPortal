const FALLBACK = "–";

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formatiert einen Cent-Betrag als Euro-String, z. B. 123456 → "1.234,56 €". */
export function formatCentsToEuro(cents: number): string {
  if (!Number.isFinite(cents)) return FALLBACK;
  return euroFormatter.format(cents / 100);
}

/**
 * Formatiert ein ISO-Datum (`YYYY-MM-DD`) oder einen ISO-Zeitstempel
 * als deutsches Datum, z. B. "2024-03-01" → "01.03.2024".
 */
export function formatDate(dateStr: string): string {
  const dateOnly = ISO_DATE.exec(dateStr);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}.${month}.${year}`;
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return FALLBACK;
  return dateFormatter.format(date);
}

/** Formatiert einen Monat (`YYYY-MM`), z. B. "2026-10" → "Oktober 2026". */
export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return FALLBACK;
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Formatiert eine Dateigröße, z. B. 1536 → "1,5 KB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return FALLBACK;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} ${units[index]}`;
}

/** Formatiert einen Prozentwert, z. B. 12.5 → "12,5 %". */
export function formatPercent(percent: number): string {
  if (!Number.isFinite(percent)) return FALLBACK;
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(percent)} %`;
}

/** Formatiert eine Fläche in m², z. B. 64.5 → "64,5 m²". */
export function formatSqm(sqm: number): string {
  if (!Number.isFinite(sqm)) return FALLBACK;
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(sqm)} m²`;
}
