import type { DocumentCategory } from "@/db/schema";

export const FILTER_ALL = "all";
/** Nur Dokumente, die keiner Einheit, sondern dem ganzen Objekt zugeordnet sind. */
export const FILTER_PROPERTY_LEVEL = "property";

export type DocumentFilter = {
  query: string;
  category: DocumentCategory | typeof FILTER_ALL;
  /** `FILTER_ALL`, `FILTER_PROPERTY_LEVEL` oder die ID einer Einheit. */
  unit: string;
};

type Filterable = {
  fileName: string;
  tags: string[];
  category: DocumentCategory;
  unitId: string | null;
};

/** Filtert nach Kategorie, Einheit und Freitext (Dateiname oder Schlagwort, ohne Beachtung der Groß-/Kleinschreibung). */
export function filterDocuments<T extends Filterable>(documents: T[], filter: DocumentFilter): T[] {
  const needle = filter.query.trim().toLocaleLowerCase("de");
  return documents.filter((document) => {
    if (filter.category !== FILTER_ALL && document.category !== filter.category) return false;
    if (filter.unit === FILTER_PROPERTY_LEVEL && document.unitId !== null) return false;
    if (
      filter.unit !== FILTER_ALL &&
      filter.unit !== FILTER_PROPERTY_LEVEL &&
      document.unitId !== filter.unit
    ) {
      return false;
    }
    if (needle === "") return true;
    return (
      document.fileName.toLocaleLowerCase("de").includes(needle) ||
      document.tags.some((tag) => tag.toLocaleLowerCase("de").includes(needle))
    );
  });
}
