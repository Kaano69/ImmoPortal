/**
 * Wandelt eine Zahleneingabe wie "1.250,50", "2.550", "850,5" oder "850.5" in eine Zahl um.
 * Leere Eingaben ergeben `undefined`, nicht lesbare Eingaben `NaN`.
 */
export function parseNumberInput(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const compact = value.replace(/[\s€%]/g, "");
  if (compact === "") return undefined;
  // Deutsche Schreibweise: "1.250,50" (Komma = Dezimal) und "2.550" (Punkt = Tausender).
  const normalized =
    compact.includes(",") || /^[1-9]\d{0,2}(\.\d{3})+$/.test(compact)
      ? compact.replaceAll(".", "").replace(",", ".")
      : compact;
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}
