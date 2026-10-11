import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/db/schema";

/** Kleingeschriebene Schlüsselwörter je Kategorie, erkannt im Dateinamen des Scans. */
const CATEGORY_KEYWORDS: Record<Exclude<DocumentCategory, "sonstiges">, string[]> = {
  "01_kauf_eigentum": [
    "kaufvertrag",
    "grundbuch",
    "notar",
    "grundriss",
    "energieausweis",
    "energiepass",
    "eigentum",
  ],
  "02_finanzierung": ["darlehen", "finanzierung", "grundschuld", "tilgung", "kredit", "bank"],
  "03_versicherungen": ["versicherung", "haftpflicht", "schaden", "police"],
  "04_steuern_behoerden": ["steuer", "grundsteuer", "finanzamt", "bescheid", "behoerde"],
  // "gas" bleibt bewusst außen vor: es träfe als Teilstring z. B. auch auf "Rathausgasse" zu.
  "05_versorger": [
    "strom",
    "erdgas",
    "gasrechnung",
    "wasser",
    "muell",
    "schornsteinfeger",
    "versorger",
  ],
  "06_kosten_rechnungen": ["rechnung", "handwerker", "kostenvoranschlag"],
  "07_instandhaltung_sanierung": ["sanierung", "instandhaltung", "angebot", "renovierung"],
  "08_nebenkosten": ["nebenkosten", "abrechnung", "zaehlerstand", "beleg"],
  "09_mietvertraege_mieter": ["mietvertrag", "mieter", "uebergabe", "kaution"],
  "10_mietrecht_mahnungen": ["mahnung", "kuendigung", "anwalt", "mietrecht", "raeumung"],
};

/** Kleinschreibung, Umlaute und „ß“ vereinheitlicht, damit Scans mit/ohne Sonderzeichen gleich erkannt werden. */
export function normalizeForMatching(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Erkennt die Dokumentenkategorie anhand von Schlüsselwörtern im Dateinamen; ohne Treffer `"sonstiges"`. */
export function detectCategory(fileName: string): DocumentCategory {
  const haystack = normalizeForMatching(fileName);
  for (const category of DOCUMENT_CATEGORIES) {
    if (category === "sonstiges") continue;
    if (CATEGORY_KEYWORDS[category].some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }
  return "sonstiges";
}

export type MatchableProperty = { id: string; name: string; street: string; city: string };

/**
 * Generische Adressbestandteile, die allein keine Liegenschaft identifizieren (z. B. würde
 * "Straße" aus "Theodor-Heuss-Straße" sonst auch in "Oberstraße" als Teilstring zutreffen).
 */
const GENERIC_ADDRESS_WORDS = new Set([
  "strasse",
  "str",
  "gasse",
  "weg",
  "platz",
  "allee",
  "ring",
  "damm",
]);

/** Signifikante Wortbestandteile aus Name, Straße und Ort eines Objekts (kurze und generische Wörter ausgeschlossen). */
function propertyTokens(property: MatchableProperty): string[] {
  const words = `${property.name} ${property.street} ${property.city}`
    .split(/[\s,/-]+/)
    .map((word) => normalizeForMatching(word).replace(/[\d.]+/g, ""))
    .filter((word) => word.length >= 4 && !GENERIC_ADDRESS_WORDS.has(word));
  return [...new Set(words)];
}

/**
 * Erkennt die zugehörige Liegenschaft anhand von Schlüsselwörtern aus Name, Straße oder Ort
 * im Dateinamen (z. B. "Oberstraße", "Rathausgasse", "Mannheim", "Theodor-Heuss"). Ohne
 * eindeutigen Treffer `null`.
 */
export function detectPropertyId(
  fileName: string,
  properties: MatchableProperty[],
): string | null {
  const haystack = normalizeForMatching(fileName);
  const matches = properties.filter((property) =>
    propertyTokens(property).some((token) => haystack.includes(token)),
  );
  return matches.length === 1 ? matches[0].id : null;
}
