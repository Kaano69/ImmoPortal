"use client";

import { Plus } from "lucide-react";

import { ActionDialog } from "@/components/action-dialog";
import { Button } from "@/components/ui/button";

import { createPropertyAction } from "../actions";
import { PropertyFields } from "./property-fields";

export function CreatePropertyDialog() {
  return (
    <ActionDialog
      trigger={
        <Button>
          <Plus />
          Immobilie anlegen
        </Button>
      }
      title="Immobilie anlegen"
      description="Lege ein neues Objekt an. Einheiten und Mieter ergänzt du anschließend in der Detailansicht."
      action={createPropertyAction}
    >
      {(state) => <PropertyFields state={state} />}
    </ActionDialog>
  );
}
