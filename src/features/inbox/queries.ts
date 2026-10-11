import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { documentInbox, properties, type DocumentCategory } from "@/db/schema";

export type InboxItem = {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  createdAt: string;
  detectedPropertyId: string | null;
  detectedPropertyName: string | null;
  detectedCategory: DocumentCategory | null;
};

export type InboxPropertyOption = { id: string; name: string };

/** Noch nicht abgelegte Posteingangs-Dokumente, älteste zuerst. */
export async function getPendingInboxItems(): Promise<InboxItem[]> {
  const rows = await db.query.documentInbox.findMany({
    where: eq(documentInbox.status, "pending"),
    with: { detectedProperty: true },
    orderBy: [asc(documentInbox.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    createdAt: row.createdAt,
    detectedPropertyId: row.detectedPropertyId,
    detectedPropertyName: row.detectedProperty?.name ?? null,
    detectedCategory: row.detectedCategory,
  }));
}

/** Aktive Objekte für die Auswahl bei der Ablage-Bestätigung. */
export async function getInboxProperties(): Promise<InboxPropertyOption[]> {
  const rows = await db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(eq(properties.isArchived, false))
    .orderBy(asc(properties.name));
  return rows;
}
