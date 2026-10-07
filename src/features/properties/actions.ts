"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { properties } from "@/db/schema";
import {
  errorState,
  optionalNumber,
  parseForm,
} from "@/lib/form-state";

import { PROPERTY_FIELDS, type PropertyFormState } from "./types";

const year = (message: string) =>
  optionalNumber(message, (schema) =>
    schema
      .int(message)
      .min(1800, "Das Jahr muss ab 1800 liegen.")
      .max(new Date().getFullYear() + 1, "Das Jahr liegt zu weit in der Zukunft."),
  );

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
    marketValueCents:
      data.marketValue === undefined ? null : Math.round(data.marketValue * 100),
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
