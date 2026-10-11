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

// ---------------------------------------------------------------------------
// Konfidenzbewertete Erkennung (Dateiname + extrahierter Volltext kombiniert),
// für den autonomen Scan-Import (`src/scripts/scan-import.ts`). Bewusst getrennt
// von `detectCategory`/`detectPropertyId` oben: diese werden vom Web-Posteingang
// genutzt, wo eine falsche Vorbelegung risikolos ist (der Nutzer bestätigt sie
// immer von Hand). Der Scan-Import kann im Modus `auto` Dateien OHNE Prüfung
// ablegen, daher werden Mehrdeutigkeiten hier strenger als Unsicherheit gewertet.
// ---------------------------------------------------------------------------

export type DetectionSource = "filename" | "text" | "filename+text" | "none";

export type CategoryDetection = {
  category: DocumentCategory;
  confidencePercent: number;
  source: DetectionSource;
};

function categoriesMatchingKeywords(haystack: string): Set<DocumentCategory> {
  const hits = new Set<DocumentCategory>();
  for (const category of DOCUMENT_CATEGORIES) {
    if (category === "sonstiges") continue;
    if (CATEGORY_KEYWORDS[category].some((keyword) => haystack.includes(keyword))) {
      hits.add(category);
    }
  }
  return hits;
}

/**
 * Erkennt die Kategorie aus Dateiname UND extrahiertem Volltext (OCR oder nativ).
 * Ein eindeutiger Treffer im Dateinamen gilt als stärkstes Signal; bestätigt der
 * Volltext denselben Treffer, steigt die Konfidenz weiter. Ein Treffer nur im
 * Volltext (ohne Dateiname-Treffer) gilt als schwächeres Signal. Treffen mehrere
 * Kategorien gleichzeitig zu, ist das Ergebnis absichtlich unsicher ("sonstiges",
 * Konfidenz 0) statt eine davon zu raten.
 */
export function detectCategoryWithConfidence(
  fileName: string,
  extractedText: string,
): CategoryDetection {
  const fileHits = categoriesMatchingKeywords(normalizeForMatching(fileName));
  const textHits = categoriesMatchingKeywords(normalizeForMatching(extractedText));

  if (fileHits.size === 1) {
    const [category] = fileHits;
    const confirmedByText = textHits.has(category);
    return {
      category,
      confidencePercent: confirmedByText ? 98 : 90,
      source: confirmedByText ? "filename+text" : "filename",
    };
  }
  if (fileHits.size === 0 && textHits.size === 1) {
    const [category] = textHits;
    return { category, confidencePercent: 65, source: "text" };
  }
  return { category: "sonstiges", confidencePercent: 0, source: "none" };
}

export type PropertyDetection = {
  propertyId: string | null;
  confidencePercent: number;
  source: DetectionSource;
};

function propertiesMatchingTokens(
  haystack: string,
  candidates: MatchableProperty[],
): MatchableProperty[] {
  return candidates.filter((property) =>
    propertyTokens(property).some((token) => haystack.includes(token)),
  );
}

/** Erkennt die Liegenschaft aus Dateiname UND extrahiertem Volltext; Logik analog zu `detectCategoryWithConfidence`. */
export function detectPropertyWithConfidence(
  fileName: string,
  extractedText: string,
  properties: MatchableProperty[],
): PropertyDetection {
  const fileMatches = propertiesMatchingTokens(normalizeForMatching(fileName), properties);
  const textMatches = propertiesMatchingTokens(normalizeForMatching(extractedText), properties);

  if (fileMatches.length === 1) {
    const confirmedByText = textMatches.some((property) => property.id === fileMatches[0].id);
    return {
      propertyId: fileMatches[0].id,
      confidencePercent: confirmedByText ? 98 : 90,
      source: confirmedByText ? "filename+text" : "filename",
    };
  }
  if (fileMatches.length === 0 && textMatches.length === 1) {
    return { propertyId: textMatches[0].id, confidencePercent: 65, source: "text" };
  }
  return { propertyId: null, confidencePercent: 0, source: "none" };
}
