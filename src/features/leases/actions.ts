"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { leases, tenants, units } from "@/db/schema";
import {
  errorState,
  isoDate,
  optionalEuroCents,
  optionalText,
  parseForm,
} from "@/lib/form-state";

import {
  END_LEASE_FIELDS,
  LEASE_FIELDS,
  type EndLeaseFormState,
  type LeaseFormState,
} from "./types";

const leaseSchema = z
  .object({
    tenantId: optionalText(64),
    firstName: optionalText(80),
    lastName: optionalText(80),
    email: optionalText(120),
    phone: optionalText(40),
    startDate: isoDate("Bitte ein gültiges Startdatum angeben."),
    endDate: z.preprocess(
      (value) => (value === "" ? undefined : value),
      isoDate("Bitte ein gültiges Enddatum angeben.").optional(),
    ),
    deposit: optionalEuroCents("Bitte einen gültigen Betrag angeben."),
  })
  .superRefine((data, ctx) => {
    if (!data.tenantId) {
      if (!data.firstName) {
        ctx.addIssue({ code: "custom", path: ["firstName"], message: "Bitte einen Vornamen angeben." });
      }
      if (!data.lastName) {
        ctx.addIssue({ code: "custom", path: ["lastName"], message: "Bitte einen Nachnamen angeben." });
      }
      if (data.email && !z.email().safeParse(data.email).success) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Bitte eine gültige E-Mail-Adresse angeben." });
      }
    }
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Das Enddatum darf nicht vor dem Startdatum liegen.",
      });
    }
  });

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Legt (bei Bedarf) einen Mieter und das Mietverhältnis an und markiert die Einheit als vermietet. */
export async function createLeaseAction(
  _previousState: LeaseFormState,
  formData: FormData,
): Promise<LeaseFormState> {
  const parsed = parseForm(leaseSchema, LEASE_FIELDS, formData);
  if (!parsed.ok) return parsed.state;
  const { data, values } = parsed;

  const unitId = readString(formData, "unitId");
  const unit = db.select().from(units).where(eq(units.id, unitId)).get();
  if (!unit) return errorState("Die Einheit wurde nicht gefunden.", values);

  const activeLease = db
    .select({ id: leases.id })
    .from(leases)
    .where(and(eq(leases.unitId, unitId), eq(leases.isActive, true)))
    .get();
  if (activeLease) {
    return errorState(
      "Diese Einheit hat bereits ein aktives Mietverhältnis. Beende es zuerst.",
      values,
    );
  }

  if (data.tenantId) {
    const tenant = db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, data.tenantId))
      .get();
    if (!tenant) {
      return errorState("Bitte bestätige die Eingaben.", values, {
        tenantId: "Der gewählte Mieter existiert nicht mehr.",
      });
    }
  }

  try {
    db.transaction((tx) => {
      const tenantId =
        data.tenantId ??
        tx
          .insert(tenants)
          .values({
            firstName: data.firstName ?? "",
            lastName: data.lastName ?? "",
            email: data.email ?? null,
            phone: data.phone ?? null,
          })
          .returning({ id: tenants.id })
          .get().id;

      tx.insert(leases)
        .values({
          unitId,
          tenantId,
          startDate: data.startDate,
          endDate: data.endDate ?? null,
          depositCents: data.deposit,
          isActive: true,
        })
        .run();
      tx.update(units).set({ isVacant: false }).where(eq(units.id, unitId)).run();
    });
  } catch (error) {
    console.error("Mietverhältnis konnte nicht angelegt werden:", error);
    return errorState("Das Mietverhältnis konnte nicht gespeichert werden.", values);
  }

  revalidatePath("/");
  revalidatePath(`/properties/${unit.propertyId}`);
  return { status: "success" };
}

const endLeaseSchema = z.object({
  endDate: isoDate("Bitte ein gültiges Enddatum angeben."),
});

/** Beendet das aktive Mietverhältnis einer Einheit zum angegebenen Datum. */
export async function endLeaseAction(
  _previousState: EndLeaseFormState,
  formData: FormData,
): Promise<EndLeaseFormState> {
  const parsed = parseForm(endLeaseSchema, END_LEASE_FIELDS, formData);
  if (!parsed.ok) return parsed.state;

  const leaseId = readString(formData, "leaseId");
  const lease = db.select().from(leases).where(eq(leases.id, leaseId)).get();
  if (!lease || !lease.isActive) {
    return errorState("Das Mietverhältnis wurde nicht gefunden oder ist bereits beendet.", parsed.values);
  }
  if (parsed.data.endDate < lease.startDate) {
    return errorState("Bitte prüfe deine Eingaben.", parsed.values, {
      endDate: "Das Enddatum darf nicht vor dem Startdatum liegen.",
    });
  }

  const unit = db.select().from(units).where(eq(units.id, lease.unitId)).get();

  try {
    db.transaction((tx) => {
      tx.update(leases)
        .set({ endDate: parsed.data.endDate, isActive: false })
        .where(eq(leases.id, leaseId))
        .run();
      tx.update(units).set({ isVacant: true }).where(eq(units.id, lease.unitId)).run();
    });
  } catch (error) {
    console.error("Mietverhältnis konnte nicht beendet werden:", error);
    return errorState("Das Mietverhältnis konnte nicht beendet werden.", parsed.values);
  }

  revalidatePath("/");
  if (unit) revalidatePath(`/properties/${unit.propertyId}`);
  return { status: "success" };
}
