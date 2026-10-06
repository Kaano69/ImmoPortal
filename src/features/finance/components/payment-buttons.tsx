"use client";

import { Check, Loader2, Trash2, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

import {
  deleteTransactionAction,
  markRentPaidAction,
  markTransactionPaidAction,
} from "../actions";

/** Führt eine Server Action aus und zeigt deren Fehlermeldung direkt neben dem Button an. */
function useRunAction() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) setError(result.error);
      } catch {
        setError("Die Aktion ist fehlgeschlagen.");
      }
    });
  }

  return { run, error, isPending };
}

function ErrorText({ message }: { message: string | null }) {
  return message ? (
    <span role="alert" className="text-xs text-destructive">
      {message}
    </span>
  ) : null;
}

export function MarkRentPaidButton({
  unitId,
  yearMonth,
  label,
}: {
  unitId: string;
  yearMonth: string;
  label: string;
}) {
  const { run, error, isPending } = useRunAction();
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        aria-label={`${label}: als bezahlt markieren`}
        onClick={() => run(() => markRentPaidAction(unitId, yearMonth))}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Check />}
        Als bezahlt markieren
      </Button>
      <ErrorText message={error} />
    </>
  );
}

export function MarkTransactionPaidButton({
  transactionId,
  label,
}: {
  transactionId: string;
  label: string;
}) {
  const { run, error, isPending } = useRunAction();
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        aria-label={`${label}: als bezahlt markieren`}
        onClick={() => run(() => markTransactionPaidAction(transactionId))}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Check />}
        Als bezahlt markieren
      </Button>
      <ErrorText message={error} />
    </>
  );
}

/** Nimmt eine erfasste Zahlung zurück (löscht die Buchung). */
export function UndoPaymentButton({
  transactionId,
  label,
}: {
  transactionId: string;
  label: string;
}) {
  const { run, error, isPending } = useRunAction();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isPending}
        aria-label={`${label}: Zahlung zurücknehmen`}
        title="Zahlung zurücknehmen"
        onClick={() =>
          run(
            () => deleteTransactionAction(transactionId),
            `Die letzte Zahlung (${label}) wirklich zurücknehmen? Die Buchung wird gelöscht.`,
          )
        }
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Undo2 />}
      </Button>
      <ErrorText message={error} />
    </>
  );
}

export function DeleteTransactionButton({
  transactionId,
  label,
}: {
  transactionId: string;
  label: string;
}) {
  const { run, error, isPending } = useRunAction();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isPending}
        aria-label={`${label} löschen`}
        onClick={() =>
          run(
            () => deleteTransactionAction(transactionId),
            `Die Buchung „${label}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.`,
          )
        }
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
      <ErrorText message={error} />
    </>
  );
}
