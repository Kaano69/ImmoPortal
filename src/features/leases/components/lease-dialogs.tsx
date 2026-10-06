"use client";

import { UserPlus, UserX } from "lucide-react";

import { ActionDialog } from "@/components/action-dialog";
import { InputField, SelectField } from "@/components/form-field";
import { Button } from "@/components/ui/button";

import { createLeaseAction, endLeaseAction } from "../actions";

export type TenantOption = { id: string; name: string };

function today(): string {
  // Lokales Datum im Format YYYY-MM-DD (schwedische Locale), nicht UTC.
  return new Date().toLocaleDateString("sv-SE");
}

export function CreateLeaseDialog({
  unitId,
  unitLabel,
  tenants,
}: {
  unitId: string;
  unitLabel: string;
  tenants: TenantOption[];
}) {
  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          <UserPlus />
          Vermieten
        </Button>
      }
      title={`Mietverhältnis anlegen – ${unitLabel}`}
      description="Wähle einen vorhandenen Mieter oder lege einen neuen an."
      action={createLeaseAction}
    >
      {(state) => (
          <>
            <input type="hidden" name="unitId" value={unitId} />
            <SelectField
              name="tenantId"
              label="Mieter"
              state={state}
              defaultValue=""
              markOptional={false}
              options={[
                { value: "", label: "Neuer Mieter …" },
                ...tenants.map((tenant) => ({ value: tenant.id, label: tenant.name })),
              ]}
            />
            <fieldset className="grid gap-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-medium">
                Daten des neuen Mieters
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <InputField name="firstName" label="Vorname" state={state} autoComplete="off" />
                <InputField name="lastName" label="Nachname" state={state} autoComplete="off" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField name="email" label="E-Mail" state={state} type="email" autoComplete="off" />
                <InputField name="phone" label="Telefon" state={state} type="tel" autoComplete="off" />
              </div>
              <p className="text-xs text-muted-foreground">
                Vor- und Nachname sind nur bei einem neuen Mieter nötig. Bei einem
                vorhandenen Mieter werden diese Felder ignoriert.
              </p>
            </fieldset>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                name="startDate"
                label="Mietbeginn"
                state={state}
                type="date"
                defaultValue={today()}
                required
              />
              <InputField name="endDate" label="Mietende" state={state} type="date" />
            </div>
            <InputField
              name="deposit"
              label="Kaution (€)"
              state={state}
              inputMode="decimal"
              placeholder="z. B. 2.550,00"
            />
          </>
      )}
    </ActionDialog>
  );
}

export function EndLeaseDialog({
  leaseId,
  tenantName,
}: {
  leaseId: string;
  tenantName: string;
}) {
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          <UserX />
          Beenden
        </Button>
      }
      title="Mietverhältnis beenden"
      description={`Das Mietverhältnis mit ${tenantName} wird beendet und die Einheit als leer markiert.`}
      submitLabel="Beenden"
      action={endLeaseAction}
    >
      {(state) => (
        <>
          <input type="hidden" name="leaseId" value={leaseId} />
          <InputField
            name="endDate"
            label="Mietende"
            state={state}
            type="date"
            defaultValue={today()}
            required
          />
        </>
      )}
    </ActionDialog>
  );
}
