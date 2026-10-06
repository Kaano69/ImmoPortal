"use client";

import { Plus } from "lucide-react";

import { ActionDialog } from "@/components/action-dialog";
import { InputField, SelectField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";

import { recordTransactionAction } from "../actions";

const TYPE_OPTIONS = Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function today(): string {
  // Lokales Datum im Format YYYY-MM-DD (schwedische Locale), nicht UTC.
  return new Date().toLocaleDateString("sv-SE");
}

export function RecordTransactionDialog({
  propertyId,
  units,
}: {
  propertyId: string;
  units: { id: string; unitNumber: string }[];
}) {
  return (
    <ActionDialog
      trigger={
        <Button size="sm">
          <Plus />
          Zahlung erfassen
        </Button>
      }
      title="Zahlung oder Ausgabe erfassen"
      description="Für Sonderzahlungen, Instandhaltung und Nebenkosten. Ohne Bezahldatum bleibt der Posten offen."
      action={recordTransactionAction}
    >
      {(state) => (
        <>
          <input type="hidden" name="propertyId" value={propertyId} />
          <SelectField
            name="type"
            label="Art"
            state={state}
            defaultValue="maintenance"
            required
            options={TYPE_OPTIONS}
          />
          <SelectField
            name="unitId"
            label="Einheit"
            state={state}
            defaultValue=""
            options={[
              { value: "", label: "Gesamtes Objekt" },
              ...units.map((unit) => ({ value: unit.id, label: unit.unitNumber })),
            ]}
          />
          <InputField
            name="amount"
            label="Betrag (€)"
            state={state}
            required
            inputMode="decimal"
            placeholder="z. B. 1.250,50"
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              name="dueDate"
              label="Fällig am"
              state={state}
              type="date"
              defaultValue={today()}
              required
            />
            <InputField
              name="paidAt"
              label="Bezahlt am"
              state={state}
              type="date"
              defaultValue={today()}
              hint="Leer lassen, wenn noch offen."
            />
          </div>
        </>
      )}
    </ActionDialog>
  );
}
