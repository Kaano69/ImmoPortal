"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useState, type ReactNode } from "react";

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
import type { FormState } from "@/lib/form-state";

type ServerFormAction<F extends string> = (
  previousState: FormState<F>,
  formData: FormData,
) => Promise<FormState<F>>;

type ActionDialogProps<F extends string> = {
  trigger: ReactNode;
  title: string;
  description?: string;
  submitLabel?: string;
  action: ServerFormAction<F>;
  /** Formularfelder; bekommt den aktuellen Zustand für Fehlermeldungen und Eingaben. */
  children: (state: FormState<F>) => ReactNode;
};

function ActionForm<F extends string>({
  action,
  submitLabel,
  onSuccess,
  children,
}: Pick<ActionDialogProps<F>, "action" | "children"> & {
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState<FormState<F>, FormData>(
    action,
    { status: "idle" },
  );

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-4">
      {children(state)}

      {state.status === "error" && Object.keys(state.fieldErrors).length === 0 ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            Abbrechen
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Modal mit Formular, das per Server Action abgesendet wird. Das Formular wird beim
 * Schließen entfernt, Fehlerzustand und Eingaben starten so bei jedem Öffnen neu.
 */
export function ActionDialog<F extends string>({
  trigger,
  title,
  description,
  submitLabel = "Speichern",
  action,
  children,
}: ActionDialogProps<F>) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <ActionForm
          action={action}
          submitLabel={submitLabel}
          onSuccess={() => setOpen(false)}
        >
          {children}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
