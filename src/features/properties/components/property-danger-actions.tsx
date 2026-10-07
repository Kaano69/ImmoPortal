"use client";

import { Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";

import { archivePropertyAction, deletePropertyAction } from "../actions";

type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Wird bei Bestätigung ausgeführt; bei Erfolg schließt sich der Dialog. */
  onConfirm: () => Promise<ActionResult>;
  onSuccess?: () => void;
};

function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onSuccess,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await onConfirm();
        if (result.success) {
          setOpen(false);
          onSuccess?.();
        } else {
          setError(result.error);
        }
      } catch {
        setError("Die Aktion ist fehlgeschlagen.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={confirm}
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PropertyDangerActions({
  propertyId,
  propertyName,
  isArchived,
}: {
  propertyId: string;
  propertyName: string;
  isArchived: boolean;
}) {
  const router = useRouter();

  return (
    <>
      {isArchived ? (
        <ConfirmDialog
          trigger={
            <Button variant="outline" size="sm">
              <ArchiveRestore />
              Wiederherstellen
            </Button>
          }
          title="Immobilie wiederherstellen?"
          description={`„${propertyName}“ erscheint wieder im Dashboard und fließt in die Kennzahlen ein.`}
          confirmLabel="Wiederherstellen"
          onConfirm={() => archivePropertyAction(propertyId, false)}
        />
      ) : (
        <ConfirmDialog
          trigger={
            <Button variant="outline" size="sm">
              <Archive />
              Archivieren
            </Button>
          }
          title="Immobilie archivieren?"
          description={`„${propertyName}“ wird im Dashboard ausgeblendet und zählt nicht mehr in die Kennzahlen. Alle Daten bleiben erhalten, du kannst das Objekt jederzeit wiederherstellen.`}
          confirmLabel="Archivieren"
          onConfirm={() => archivePropertyAction(propertyId, true)}
          onSuccess={() => router.push("/")}
        />
      )}
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 />
            Löschen
          </Button>
        }
        title="Immobilie endgültig löschen?"
        description={`„${propertyName}“ wird samt Einheiten und hochgeladenen Dokumenten unwiderruflich gelöscht. Objekte mit Mietverhältnissen oder Buchungen lassen sich nicht löschen, sondern nur archivieren.`}
        confirmLabel="Endgültig löschen"
        destructive
        onConfirm={() => deletePropertyAction(propertyId)}
        onSuccess={() => router.push("/")}
      />
    </>
  );
}
