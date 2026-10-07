export type RequiredDocument = {
  key: string;
  label: string;
  /** Kleingeschriebene Schlüsselwörter, die im Dateinamen oder in einem Schlagwort vorkommen müssen. */
  keywords: string[];
};

/** Pflichtunterlagen je Objekt; erkannt werden sie anhand von Dateiname und Schlagwörtern. */
export const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  { key: "kaufvertrag", label: "Kaufvertrag", keywords: ["kaufvertrag"] },
  { key: "grundbuch", label: "Grundbuchauszug", keywords: ["grundbuch"] },
  { key: "energieausweis", label: "Energieausweis", keywords: ["energieausweis", "energiepass"] },
];

/** Gibt die Bezeichnungen der Pflichtunterlagen zurück, zu denen kein Dokument gefunden wurde. */
export function findMissingDocuments(
  documents: { fileName: string; tags: string[] }[],
): string[] {
  const haystacks = documents.map((document) =>
    [document.fileName, ...document.tags].join(" ").toLocaleLowerCase("de"),
  );
  return REQUIRED_DOCUMENTS.filter(
    (required) =>
      !haystacks.some((text) => required.keywords.some((keyword) => text.includes(keyword))),
  ).map((required) => required.label);
}
