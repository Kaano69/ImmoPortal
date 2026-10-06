"use client";

import { Pencil } from "lucide-react";

import { ActionDialog } from "@/components/action-dialog";
import { Button } from "@/components/ui/button";

import { updatePropertyAction } from "../actions";
import { PropertyFields, type PropertyDefaults } from "./property-fields";

export function EditPropertyDialog({
  propertyId,
  defaults,
}: {
  propertyId: string;
  defaults: PropertyDefaults;
}) {
  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          <Pencil />
          Bearbeiten
        </Button>
      }
      title="Stammdaten bearbeiten"
      action={updatePropertyAction}
    >
      {(state) => (
        <>
          <input type="hidden" name="id" value={propertyId} />
          <PropertyFields state={state} defaults={defaults} />
        </>
      )}
    </ActionDialog>
  );
}
