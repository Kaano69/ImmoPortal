"use client";

import { InputField } from "@/components/form-field";

import type { PropertyFormState } from "../types";

export type PropertyDefaults = {
  name: string;
  street: string;
  zip: string;
  city: string;
  totalSqm: string;
  marketValue: string;
  buildYear: string;
  purchaseYear: string;
};

export function PropertyFields({
  state,
  defaults,
}: {
  state: PropertyFormState;
  defaults?: PropertyDefaults;
}) {
  return (
    <>
      <InputField
        name="name"
        label="Name"
        state={state}
        defaultValue={defaults?.name}
        required
        placeholder="z. B. Mehrfamilienhaus Lindenstraße"
      />
      <InputField
        name="street"
        label="Straße und Hausnummer"
        state={state}
        defaultValue={defaults?.street}
        required
        autoComplete="street-address"
      />
      <div className="grid grid-cols-[8rem_1fr] gap-4">
        <InputField
          name="zip"
          label="PLZ"
          state={state}
          defaultValue={defaults?.zip}
          required
          inputMode="numeric"
          autoComplete="postal-code"
        />
        <InputField
          name="city"
          label="Ort"
          state={state}
          defaultValue={defaults?.city}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField
          name="totalSqm"
          label="Wohnfläche (m²)"
          state={state}
          defaultValue={defaults?.totalSqm}
          inputMode="decimal"
          placeholder="z. B. 320,5"
        />
        <InputField
          name="marketValue"
          label="Marktwert (€)"
          state={state}
          defaultValue={defaults?.marketValue}
          inputMode="decimal"
          placeholder="z. B. 460.000"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField
          name="buildYear"
          label="Baujahr"
          state={state}
          defaultValue={defaults?.buildYear}
          inputMode="numeric"
          placeholder="z. B. 1972"
        />
        <InputField
          name="purchaseYear"
          label="Kaufjahr"
          state={state}
          defaultValue={defaults?.purchaseYear}
          inputMode="numeric"
          placeholder="z. B. 2019"
        />
      </div>
    </>
  );
}
