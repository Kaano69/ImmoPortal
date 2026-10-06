"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { DOCUMENT_CATEGORIES, documents, properties, units } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { deleteDocumentFile, saveDocumentFile, StorageError } from "@/lib/storage";

/** Leere Formularfelder (`""`) werden wie fehlende Felder behandelt. */
const optionalId = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const uploadSchema = z
  .object({
    propertyId: optionalId,
    unitId: optionalId,
    category: z.enum(DOCUMENT_CATEGORIES).default("other"),
  })
  .refine((v) => v.propertyId !== undefined || v.unitId !== undefined, {
    message: "Ein Dokument muss einem Objekt oder einer Einheit zugeordnet sein.",
  });

const idSchema = z.string().min(1);

export async function uploadDocumentAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Es wurde keine Datei übermittelt." };
  }

  const parsed = uploadSchema.safeParse({
    propertyId: formData.get("propertyId") ?? undefined,
    unitId: formData.get("unitId") ?? undefined,
    category: formData.get("category") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe.",
    };
  }
  const { unitId, category } = parsed.data;
  let { propertyId } = parsed.data;

  // Verweise prüfen; bei einer Einheit gehört die Datei ins Verzeichnis ihres Objekts.
  if (unitId) {
    const unit = db.select().from(units).where(eq(units.id, unitId)).get();
    if (!unit) return { success: false, error: "Einheit nicht gefunden." };
    if (propertyId && propertyId !== unit.propertyId) {
      return {
        success: false,
        error: "Die Einheit gehört nicht zum angegebenen Objekt.",
      };
    }
    propertyId = unit.propertyId;
  } else if (propertyId) {
    const property = db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .get();
    if (!property) return { success: false, error: "Objekt nicht gefunden." };
  }
  if (!propertyId) {
    return { success: false, error: "Objekt nicht gefunden." };
  }

  let filePath: string;
  try {
    filePath = await saveDocumentFile(file, propertyId);
  } catch (error) {
    if (error instanceof StorageError) {
      return { success: false, error: error.message };
    }
    console.error("Dokument konnte nicht gespeichert werden:", error);
    return { success: false, error: "Die Datei konnte nicht gespeichert werden." };
  }

  try {
    const [created] = db
      .insert(documents)
      .values({
        propertyId,
        unitId: unitId ?? null,
        fileName: file.name,
        filePath,
        fileSizeBytes: file.size,
        category,
      })
      .returning({ id: documents.id })
      .all();

    revalidatePath("/", "layout");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    // DB-Eintrag fehlgeschlagen: keine verwaiste Datei zurücklassen.
    console.error("Dokument konnte nicht in der Datenbank angelegt werden:", error);
    await deleteDocumentFile(filePath).catch(() => undefined);
    return { success: false, error: "Das Dokument konnte nicht angelegt werden." };
  }
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false, error: "Ungültige Dokument-ID." };
  }

  const document = db
    .select()
    .from(documents)
    .where(eq(documents.id, parsedId.data))
    .get();
  if (!document) {
    return { success: false, error: "Dokument nicht gefunden." };
  }

  db.delete(documents).where(eq(documents.id, document.id)).run();

  try {
    await deleteDocumentFile(document.filePath);
  } catch (error) {
    // Der Eintrag ist bereits entfernt; eine übrig gebliebene Datei ist nur Speicherplatz.
    console.error(`Datei ${document.filePath} konnte nicht gelöscht werden:`, error);
  }

  revalidatePath("/", "layout");
  return { success: true };
}
