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

/** Formatiert eine Fläche in m², z. B. 64.5 → "64,5 m²". */
export function formatSqm(sqm: number): string {
  if (!Number.isFinite(sqm)) return FALLBACK;
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(sqm)} m²`;
}
