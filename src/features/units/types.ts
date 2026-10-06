import type { FormState } from "@/lib/form-state";

export const UNIT_FIELDS = [
  "unitNumber",
  "type",
  "sqm",
  "coldRent",
  "additionalCosts",
] as const;

export type UnitField = (typeof UNIT_FIELDS)[number];
export type UnitFormState = FormState<UnitField>;
