"use client";

import { ShieldCheck, UserPlus, UserX } from "lucide-react";

import { ActionDialog } from "@/components/action-dialog";
import { InputField, SelectField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import type { DepositStatus } from "@/db/schema";
import { DEPOSIT_STATUS_LABELS } from "@/lib/labels";

import { createLeaseAction, endLeaseAction, updateDepositAction } from "../actions";

export type TenantOption = { id: string; name: string };
export type ProofDocumentOption = { id: string; fileName: string };

const DEPOSIT_STATUS_OPTIONS = Object.entries(DEPOSIT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

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

function centsToInput(cents: number): string {
  return cents === 0 ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

export function DepositDialog({
  leaseId,
  tenantName,
  depositCents,
  defaults,
  proofDocuments,
}: {
  leaseId: string;
  tenantName: string;
  depositCents: number;
  defaults: {
    status: DepositStatus;
    receivedAmountCents: number;
    bankAccount: string | null;
    proofDocumentId: string | null;
  };
  proofDocuments: ProofDocumentOption[];
}) {
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          <ShieldCheck />
          Kaution
        </Button>
      }
      title={`Kaution verwalten – ${tenantName}`}
      description={`Soll-Kaution laut Mietvertrag: ${centsToInput(depositCents) || "0,00"} €.`}
      action={updateDepositAction}
    >
      {(state) => (
        <>
          <input type="hidden" name="leaseId" value={leaseId} />
          <SelectField
            name="status"
            label="Status"
            state={state}
            defaultValue={defaults.status}
            markOptional={false}
            options={DEPOSIT_STATUS_OPTIONS}
          />
          <InputField
            name="receivedAmount"
            label="Tatsächlich erhaltener Betrag (€)"
            state={state}
            defaultValue={centsToInput(defaults.receivedAmountCents)}
            inputMode="decimal"
            placeholder="z. B. 2.550,00"
          />
          <InputField
            name="bankAccount"
            label="Kautions-/Treuhandkonto"
            state={state}
            defaultValue={defaults.bankAccount ?? ""}
            placeholder="z. B. Mietkautionskonto Sparkasse"
          />
          <SelectField
            name="proofDocumentId"
            label="Nachweis-Dokument"
            state={state}
            defaultValue={defaults.proofDocumentId ?? ""}
            options={[
              { value: "", label: "Kein Nachweis hinterlegt" },
              ...proofDocuments.map((doc) => ({ value: doc.id, label: doc.fileName })),
            ]}
            hint="Lade den Nachweis vorab über „Dokument hochladen“ im Archiv dieses Objekts hoch."
          />
        </>
      )}
    </ActionDialog>
  );
}
