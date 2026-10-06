"use client";

import { Pencil, Plus } from "lucide-react";

import { ActionDialog } from "@/components/action-dialog";
import { Button } from "@/components/ui/button";

import { createUnitAction, updateUnitAction } from "../actions";
import { UnitFields, type UnitDefaults } from "./unit-fields";

export function CreateUnitDialog({ propertyId }: { propertyId: string }) {
  return (
    <ActionDialog
      trigger={
        <Button size="sm">
          <Plus />
          Einheit anlegen
        </Button>
      }
      title="Einheit anlegen"
      description="Beträge in Euro pro Monat. Die Warmmiete ergibt sich aus Kaltmiete plus Nebenkosten."
      action={createUnitAction}
    >
      {(state) => (
        <>
          <input type="hidden" name="propertyId" value={propertyId} />
          <UnitFields state={state} />
        </>
      )}
    </ActionDialog>
  );
}

export function EditUnitDialog({
  unitId,
  defaults,
}: {
  unitId: string;
  defaults: UnitDefaults;
}) {
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label="Einheit bearbeiten">
          <Pencil />
        </Button>
      }
      title="Einheit bearbeiten"
      action={updateUnitAction}
    >
      {(state) => (
        <>
          <input type="hidden" name="id" value={unitId} />
          <UnitFields state={state} defaults={defaults} />
        </>
      )}
    </ActionDialog>
  );
}
