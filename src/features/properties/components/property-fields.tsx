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
  monthlyLoanPayment: string;
  annualCosts: string;
  annualMaintenanceReserve: string;
  vacancyReserve: string;
  purchaseDate: string;
  acquisitionCost: string;
  loanBalance: string;
  loanBalanceDate: string;
  loanInterest: string;
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

      <fieldset className="grid gap-4 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">
          Finanzierung &amp; Kalkulation
        </legend>
        <p className="-mt-2 text-xs text-muted-foreground">
          Grundlage für den Zielmieten-Rechner.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            name="monthlyLoanPayment"
            label="Darlehensrate (€ / Monat)"
            state={state}
            defaultValue={defaults?.monthlyLoanPayment}
            inputMode="decimal"
            placeholder="z. B. 2.265"
          />
          <InputField
            name="annualCosts"
            label="Nicht umlegbare Kosten (€ / Jahr)"
            state={state}
            defaultValue={defaults?.annualCosts}
            inputMode="decimal"
            placeholder="z. B. 8.513,89"
          />
          <InputField
            name="annualMaintenanceReserve"
            label="Instandhaltungsrücklage (€ / Jahr)"
            state={state}
            defaultValue={defaults?.annualMaintenanceReserve}
            inputMode="decimal"
            placeholder="z. B. 4.092"
          />
          <InputField
            name="vacancyReserve"
            label="Kalkulierter Leerstand (%)"
            state={state}
            defaultValue={defaults?.vacancyReserve}
            inputMode="decimal"
            placeholder="z. B. 3"
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Kauf &amp; Darlehensstand</legend>
        <p className="-mt-2 text-xs text-muted-foreground">
          Grundlage für den Verkaufs- &amp; Exit-Rechner.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            name="purchaseDate"
            label="Kaufdatum"
            state={state}
            type="date"
            defaultValue={defaults?.purchaseDate}
            hint="Für die 10-Jahres-Frist (§ 23 EStG)."
          />
          <InputField
            name="acquisitionCost"
            label="Bereinigte Anschaffungskosten (€)"
            state={state}
            defaultValue={defaults?.acquisitionCost}
            inputMode="decimal"
            placeholder="z. B. 505.353,18"
            hint="Kaufpreis + Nebenkosten + Renovierung."
          />
          <InputField
            name="loanBalance"
            label="Restschuld (€)"
            state={state}
            defaultValue={defaults?.loanBalance}
            inputMode="decimal"
            placeholder="z. B. 445.236,05"
          />
          <InputField
            name="loanBalanceDate"
            label="Stand der Restschuld"
            state={state}
            type="date"
            defaultValue={defaults?.loanBalanceDate}
          />
          <InputField
            name="loanInterest"
            label="Darlehenszins (% p. a.)"
            state={state}
            defaultValue={defaults?.loanInterest}
            inputMode="decimal"
            placeholder="z. B. 4,22"
          />
        </div>
      </fieldset>
    </>
  );
}
