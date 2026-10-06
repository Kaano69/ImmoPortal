"use client";

import { InputField, SelectField } from "@/components/form-field";
import { UNIT_TYPE_LABELS } from "@/lib/labels";

import type { UnitFormState } from "../types";

export type UnitDefaults = {
  unitNumber: string;
  type: string;
  sqm: string;
  coldRent: string;
  additionalCosts: string;
};

const TYPE_OPTIONS = Object.entries(UNIT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function UnitFields({
  state,
  defaults,
}: {
  state: UnitFormState;
  defaults?: UnitDefaults;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <InputField
          name="unitNumber"
          label="Einheitennummer"
          state={state}
          defaultValue={defaults?.unitNumber}
          required
          placeholder="z. B. WE 1 / EG links"
        />
        <SelectField
          name="type"
          label="Typ"
          state={state}
          defaultValue={defaults?.type ?? "apartment"}
          required
          options={TYPE_OPTIONS}
        />
      </div>
      <InputField
        name="sqm"
        label="Fläche (m²)"
        state={state}
        defaultValue={defaults?.sqm}
        inputMode="decimal"
        placeholder="z. B. 64,5"
      />
      <div className="grid grid-cols-2 gap-4">
        <InputField
          name="coldRent"
          label="Kaltmiete (€ / Monat)"
          state={state}
          defaultValue={defaults?.coldRent}
          required
          inputMode="decimal"
          placeholder="z. B. 850,00"
        />
        <InputField
          name="additionalCosts"
          label="Nebenkosten (€ / Monat)"
          state={state}
          defaultValue={defaults?.additionalCosts}
          inputMode="decimal"
          placeholder="z. B. 180,00"
        />
      </div>
    </>
  );
}
