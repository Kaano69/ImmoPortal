import { z } from "zod";

/** Zustand eines Formulars, das über `useActionState` an eine Server Action gebunden ist. */
export type FormState<F extends string> =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors: Partial<Record<F, string>>;
      /** Eingaben, damit das Formular nach dem Absenden nicht geleert wird. */
      values: Record<F, string>;
    };

export type ParsedForm<F extends string, T> =
  | { ok: true; data: T; values: Record<F, string> }
  | { ok: false; state: Extract<FormState<F>, { status: "error" }> };

export function errorState<F extends string>(
  message: string,
  values: Record<F, string>,
  fieldErrors: Partial<Record<F, string>> = {},
): Extract<FormState<F>, { status: "error" }> {
  return { status: "error", message, fieldErrors, values };
}

/** Liest die Felder aus dem FormData und validiert sie mit dem Zod-Schema. */
export function parseForm<F extends string, S extends z.ZodType>(
  schema: S,
  fields: readonly F[],
  formData: FormData,
): ParsedForm<F, z.output<S>> {
  const values = Object.fromEntries(
    fields.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === "string" ? value : ""];
    }),
  ) as Record<F, string>;

  const parsed = schema.safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data, values };

  const fieldErrors: Partial<Record<F, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && (fields as readonly string[]).includes(field)) {
      const key = field as F;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  return {
    ok: false,
    state: errorState("Bitte prüfe deine Eingaben.", values, fieldErrors),
  };
}

// ---------------------------------------------------------------------------
// Eingabe-Parser (deutsche Zahlenformate)
// ---------------------------------------------------------------------------

/**
 * Wandelt eine Zahleneingabe wie "1.250,50", "2.550", "850,5" oder "850.5" in eine Zahl um.
 * Leere Eingaben ergeben `undefined`, nicht lesbare Eingaben `NaN`.
 */
export function parseNumberInput(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const compact = value.replace(/[\s€]/g, "");
  if (compact === "") return undefined;
  // Deutsche Schreibweise: "1.250,50" (Komma = Dezimal) und "2.550" (Punkt = Tausender).
  const normalized =
    compact.includes(",") || /^[1-9]\d{0,2}(\.\d{3})+$/.test(compact)
      ? compact.replaceAll(".", "").replace(",", ".")
      : compact;
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/** Optionale Zahl (leer → undefined), Dezimalkomma erlaubt. */
export const optionalNumber = (
  invalidMessage: string,
  refine: (schema: z.ZodNumber) => z.ZodNumber = (schema) => schema,
) =>
  z.preprocess(
    parseNumberInput,
    refine(z.number({ error: invalidMessage })).optional(),
  );

const euroNumber = (invalidMessage: string) =>
  z
    .number({ error: invalidMessage })
    .min(0, "Der Betrag darf nicht negativ sein.")
    .max(10_000_000, "Der Betrag ist zu groß.");

/** Euro-Betrag als Pflichtfeld, Ergebnis in ganzen Cent. */
export const requiredEuroCents = (
  requiredMessage: string,
  invalidMessage: string,
) =>
  z.preprocess(
    parseNumberInput,
    z
      .number({
        error: (issue) =>
          issue.input === undefined ? requiredMessage : invalidMessage,
      })
      .min(0, "Der Betrag darf nicht negativ sein.")
      .max(10_000_000, "Der Betrag ist zu groß.")
      .transform((euro) => Math.round(euro * 100)),
  );

/** Optionaler Euro-Betrag (leer → 0 Cent). */
export const optionalEuroCents = (invalidMessage: string) =>
  z.preprocess(
    parseNumberInput,
    euroNumber(invalidMessage)
      .optional()
      .transform((euro) => Math.round((euro ?? 0) * 100)),
  );

/** ISO-Datum `YYYY-MM-DD` (wie `<input type="date">` es liefert), auf Gültigkeit geprüft. */
export const isoDate = (message: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), message);

/** Leerer String → undefined, sonst getrimmter String. */
export const optionalText = (max = 200) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );
