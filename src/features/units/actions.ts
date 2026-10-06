"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { UNIT_TYPES, properties, units } from "@/db/schema";
import {
  errorState,
  optionalEuroCents,
  optionalNumber,
  parseForm,
  requiredEuroCents,
} from "@/lib/form-state";

import { UNIT_FIELDS, type UnitFormState } from "./types";

const unitSchema = z.object({
  unitNumber: z.string().trim().min(1, "Bitte eine Einheitennummer angeben.").max(40),
  type: z.enum(UNIT_TYPES, { error: "Bitte einen Typ wählen." }),
  sqm: optionalNumber("Bitte eine gültige Zahl angeben.", (schema) =>
    schema.positive("Die Fläche muss größer als 0 sein.").max(100_000, "Die Fläche ist zu groß."),
  ),
  coldRent: requiredEuroCents("Bitte die Kaltmiete angeben.", "Bitte einen gültigen Betrag angeben."),
  additionalCosts: optionalEuroCents("Bitte einen gültigen Betrag angeben."),
});

function toRow(data: z.output<typeof unitSchema>) {
  return {
    unitNumber: data.unitNumber,
    type: data.type,
    sqm: data.sqm ?? null,
    coldRentCents: data.coldRent,
    additionalCostsCents: data.additionalCosts,
  };
}

function readId(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createUnitAction(
  _previousState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  const parsed = parseForm(unitSchema, UNIT_FIELDS, formData);
  if (!parsed.ok) return parsed.state;

  const propertyId = readId(formData, "propertyId");
  const property = db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .get();
  if (!property) return errorState("Die Immobilie wurde nicht gefunden.", parsed.values);

  const duplicate = db
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.propertyId, propertyId), eq(units.unitNumber, parsed.data.unitNumber)))
    .get();
  if (duplicate) {
    return errorState("Bitte prüfe deine Eingaben.", parsed.values, {
      unitNumber: "Diese Einheitennummer existiert in diesem Objekt bereits.",
    });
  }

  try {
    db.insert(units).values({ ...toRow(parsed.data), propertyId }).run();
  } catch (error) {
    console.error("Einheit konnte nicht angelegt werden:", error);
    return errorState("Die Einheit konnte nicht gespeichert werden.", parsed.values);
  }

  revalidatePath("/");
  revalidatePath(`/properties/${propertyId}`);
  return { status: "success" };
}

export async function updateUnitAction(
  _previousState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  const parsed = parseForm(unitSchema, UNIT_FIELDS, formData);
  if (!parsed.ok) return parsed.state;

  const id = readId(formData, "id");
  const unit = db.select().from(units).where(eq(units.id, id)).get();
  if (!unit) return errorState("Die Einheit wurde nicht gefunden.", parsed.values);

  const duplicate = db
    .select({ id: units.id })
    .from(units)
    .where(
      and(
        eq(units.propertyId, unit.propertyId),
        eq(units.unitNumber, parsed.data.unitNumber),
        ne(units.id, id),
      ),
    )
    .get();
  if (duplicate) {
    return errorState("Bitte prüfe deine Eingaben.", parsed.values, {
      unitNumber: "Diese Einheitennummer existiert in diesem Objekt bereits.",
    });
  }

  try {
    db.update(units).set(toRow(parsed.data)).where(eq(units.id, id)).run();
  } catch (error) {
    console.error("Einheit konnte nicht aktualisiert werden:", error);
    return errorState("Die Einheit konnte nicht gespeichert werden.", parsed.values);
  }

  revalidatePath("/");
  revalidatePath(`/properties/${unit.propertyId}`);
  return { status: "success" };
}
