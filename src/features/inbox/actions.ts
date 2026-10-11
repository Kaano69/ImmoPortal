"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { DOCUMENT_CATEGORIES, documentInbox, documents, properties } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { deleteDocumentFile, moveDocumentFile, saveDocumentFile, StorageError } from "@/lib/storage";

import { detectCategory, detectPropertyId } from "./classify";

/** Unterordner, in dem Posteingangs-Dateien bis zur Ablage-Bestätigung liegen. */
const INBOX_SUBFOLDER = "_inbox";

/** Speichert eine hochgeladene PDF im Posteingang und schlägt Objekt und Kategorie vor. */
export async function uploadInboxFileAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Es wurde keine Datei übermittelt." };
  }

  let filePath: string;
  try {
    filePath = await saveDocumentFile(file, INBOX_SUBFOLDER);
  } catch (error) {
    if (error instanceof StorageError) return { success: false, error: error.message };
    console.error("Datei konnte nicht in den Posteingang gespeichert werden:", error);
    return { success: false, error: "Die Datei konnte nicht gespeichert werden." };
  }

  const activeProperties = db
    .select({
      id: properties.id,
      name: properties.name,
      street: properties.street,
      city: properties.city,
    })
    .from(properties)
    .where(eq(properties.isArchived, false))
    .all();

  try {
    const [created] = db
      .insert(documentInbox)
      .values({
        fileName: file.name,
        filePath,
        fileSizeBytes: file.size,
        detectedPropertyId: detectPropertyId(file.name, activeProperties),
        detectedCategory: detectCategory(file.name),
      })
      .returning({ id: documentInbox.id })
      .all();

    revalidatePath("/inbox");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("Posteingangs-Eintrag konnte nicht angelegt werden:", error);
    await deleteDocumentFile(filePath).catch(() => undefined);
    return { success: false, error: "Der Eintrag konnte nicht angelegt werden." };
  }
}

const confirmSchema = z.object({
  id: z.string().min(1),
  propertyId: z.string().min(1, "Bitte ein Objekt wählen."),
  category: z.enum(DOCUMENT_CATEGORIES, { error: "Bitte eine gültige Kategorie wählen." }),
});

/** Übernimmt ein Posteingangs-Dokument ins reguläre Archiv: Datei verschieben, Eintrag anlegen. */
export async function confirmInboxItemAction(formData: FormData): Promise<ActionResult> {
  const parsed = confirmSchema.safeParse({
    id: formData.get("id"),
    propertyId: formData.get("propertyId"),
    category: formData.get("category"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const { id, propertyId, category } = parsed.data;

  const item = db.select().from(documentInbox).where(eq(documentInbox.id, id)).get();
  if (!item || item.status !== "pending") {
    return {
      success: false,
      error: "Der Posteingangs-Eintrag wurde nicht gefunden oder ist bereits verarbeitet.",
    };
  }

  const property = db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .get();
  if (!property) return { success: false, error: "Das gewählte Objekt wurde nicht gefunden." };

  let newPath: string;
  try {
    newPath = await moveDocumentFile(item.filePath, propertyId);
  } catch (error) {
    if (error instanceof StorageError) return { success: false, error: error.message };
    console.error("Datei konnte nicht abgelegt werden:", error);
    return { success: false, error: "Die Datei konnte nicht abgelegt werden." };
  }

  try {
    db.transaction((tx) => {
      tx.insert(documents)
        .values({
          propertyId,
          fileName: item.fileName,
          filePath: newPath,
          fileSizeBytes: item.fileSizeBytes,
          category,
          tags: [],
        })
        .run();
      tx.update(documentInbox).set({ status: "processed" }).where(eq(documentInbox.id, id)).run();
    });
  } catch (error) {
    console.error("Dokument konnte nicht abgelegt werden:", error);
    await moveDocumentFile(newPath, INBOX_SUBFOLDER).catch(() => undefined);
    return { success: false, error: "Das Dokument konnte nicht abgelegt werden." };
  }

  revalidatePath("/inbox");
  revalidatePath("/", "layout");
  return { success: true };
}

const idSchema = z.string().min(1);

/** Entfernt einen Posteingangs-Eintrag samt Datei (z. B. ein versehentlich hochgeladener Scan). */
export async function deleteInboxItemAction(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { success: false, error: "Ungültige ID." };

  const item = db.select().from(documentInbox).where(eq(documentInbox.id, parsedId.data)).get();
  if (!item) return { success: false, error: "Der Eintrag wurde nicht gefunden." };

  db.delete(documentInbox).where(eq(documentInbox.id, item.id)).run();
  await deleteDocumentFile(item.filePath).catch((error) => {
    console.error(`Datei ${item.filePath} konnte nicht gelöscht werden:`, error);
  });

  revalidatePath("/inbox");
  return { success: true };
}
