"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { leases, properties, transactions, units } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import {
  errorState,
  optionalNumber,
  parseForm,
} from "@/lib/form-state";

import { deleteDocumentFolder } from "@/lib/storage";

import { PROPERTY_FIELDS, type PropertyFormState } from "./types";

const year = (message: string) =>
  optionalNumber(message, (schema) =>
    schema
      .int(message)
      .min(1800, "Das Jahr muss ab 1800 liegen.")
      .max(new Date().getFullYear() + 1, "Das Jahr liegt zu weit in der Zukunft."),
  );

const euro = (invalidMessage: string) =>
  optionalNumber(invalidMessage, (schema) =>
    schema.min(0, "Der Betrag darf nicht negativ sein.").max(1_000_000_000, "Der Betrag ist zu groß."),
  );

const toCents = (euro: number | undefined): number | null =>
  euro === undefined ? null : Math.round(euro * 100);

const propertySchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(120),
  street: z.string().trim().min(1, "Bitte eine Straße angeben.").max(120),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Die PLZ muss aus 5 Ziffern bestehen."),
  city: z.string().trim().min(1, "Bitte einen Ort angeben.").max(120),
  totalSqm: optionalNumber("Bitte eine gültige Zahl angeben.", (schema) =>
    schema.positive("Die Fläche muss größer als 0 sein.").max(1_000_000, "Die Fläche ist zu groß."),
  ),
  marketValue: optionalNumber("Bitte einen gültigen Betrag angeben.", (schema) =>
    schema.positive("Der Wert muss größer als 0 sein.").max(1_000_000_000, "Der Wert ist zu groß."),
  ),
  monthlyLoanPayment: euro("Bitte einen gültigen Betrag angeben."),
  annualCosts: euro("Bitte einen gültigen Betrag angeben."),
  annualMaintenanceReserve: euro("Bitte einen gültigen Betrag angeben."),
  vacancyReserve: optionalNumber("Bitte einen gültigen Prozentwert angeben.", (schema) =>
    schema.min(0, "Der Wert darf nicht negativ sein.").max(50, "Maximal 50 %."),
  ),
  buildYear: year("Bitte ein gültiges Baujahr angeben."),
  purchaseYear: year("Bitte ein gültiges Kaufjahr angeben."),
});

function toRow(data: z.output<typeof propertySchema>) {
  return {
    name: data.name,
    street: data.street,
    zip: data.zip,
    city: data.city,
    totalSqm: data.totalSqm ?? null,
    marketValueCents: toCents(data.marketValue),
    monthlyLoanPaymentCents: toCents(data.monthlyLoanPayment),
    annualCostsCents: toCents(data.annualCosts),
    annualMaintenanceReserveCents: toCents(data.annualMaintenanceReserve),
    vacancyReservePercent: data.vacancyReserve ?? null,
    buildYear: data.buildYear ?? null,
    purchaseYear: data.purchaseYear ?? null,
  };
}

export async function createPropertyAction(
  _previousState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = parseForm(propertySchema, PROPERTY_FIELDS, formData);
  if (!parsed.ok) return parsed.state;

  try {
    db.insert(properties).values(toRow(parsed.data)).run();
  } catch (error) {
    console.error("Immobilie konnte nicht angelegt werden:", error);
    return errorState("Die Immobilie konnte nicht gespeichert werden.", parsed.values);
  }

  revalidatePath("/");
  return { status: "success" };
}

export async function updatePropertyAction(
  _previousState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = parseForm(propertySchema, PROPERTY_FIELDS, formData);
  if (!parsed.ok) return parsed.state;

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("Die Immobilie wurde nicht gefunden.", parsed.values);
  }

  try {
    const updated = db
      .update(properties)
      .set(toRow(parsed.data))
      .where(eq(properties.id, id))
      .returning({ id: properties.id })
      .all();
    if (updated.length === 0) {
      return errorState("Die Immobilie wurde nicht gefunden.", parsed.values);
    }
  } catch (error) {
    console.error("Immobilie konnte nicht aktualisiert werden:", error);
    return errorState("Die Immobilie konnte nicht gespeichert werden.", parsed.values);
  }

  revalidatePath("/");
  revalidatePath(`/properties/${id}`);
  return { status: "success" };
}

const idSchema = z.string().min(1);

/** Archiviert ein Objekt (oder stellt es wieder her). Alle Daten bleiben erhalten. */
export async function archivePropertyAction(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { success: false, error: "Ungültige Objekt-ID." };

  const updated = db
    .update(properties)
    .set({ isArchived: archived })
    .where(eq(properties.id, parsedId.data))
    .returning({ id: properties.id })
    .all();
  if (updated.length === 0) return { success: false, error: "Die Immobilie wurde nicht gefunden." };

  revalidatePath("/");
  revalidatePath(`/properties/${parsedId.data}`);
  return { success: true };
}

/**
 * Löscht ein Objekt endgültig samt Einheiten und Dokumenten (inkl. PDF-Dateien).
 * Objekte mit Mietverhältnissen oder Buchungen werden nicht gelöscht, weil das
 * rechtlich relevante Historie wäre; sie lassen sich stattdessen archivieren.
 */
export async function deletePropertyAction(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { success: false, error: "Ungültige Objekt-ID." };
  const propertyId = parsedId.data;

  const property = db.select({ id: properties.id }).from(properties).where(eq(properties.id, propertyId)).get();
  if (!property) return { success: false, error: "Die Immobilie wurde nicht gefunden." };

  const leaseCount =
    db
      .select({ value: count() })
      .from(leases)
      .innerJoin(units, eq(leases.unitId, units.id))
      .where(eq(units.propertyId, propertyId))
      .get()?.value ?? 0;
  const transactionCount =
    db
      .select({ value: count() })
      .from(transactions)
      .where(eq(transactions.propertyId, propertyId))
      .get()?.value ?? 0;
  if (leaseCount > 0 || transactionCount > 0) {
    return {
      success: false,
      error:
        "Die Immobilie hat Mietverhältnisse oder Buchungen und kann nicht gelöscht werden. Bitte archiviere sie stattdessen.",
    };
  }

  try {
    // Einheiten und Dokument-Einträge werden per ON DELETE CASCADE mitgelöscht.
    db.delete(properties).where(eq(properties.id, propertyId)).run();
  } catch (error) {
    console.error("Immobilie konnte nicht gelöscht werden:", error);
    return { success: false, error: "Die Immobilie konnte nicht gelöscht werden." };
  }

  try {
    await deleteDocumentFolder(propertyId);
  } catch (error) {
    // Der Datenbankeintrag ist bereits entfernt; übrig gebliebene Dateien belegen nur Speicherplatz.
    console.error(`Dokumentenordner ${propertyId} konnte nicht gelöscht werden:`, error);
  }

  revalidatePath("/");
  return { success: true };
}
