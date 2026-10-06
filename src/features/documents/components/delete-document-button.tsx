"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteDocumentAction } from "../actions";

export function DeleteDocumentButton({
  id,
  fileName,
}: {
  id: string;
  fileName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(`„${fileName}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteDocumentAction(id);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${fileName} löschen`}
        disabled={isPending}
        onClick={onClick}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </>
  );
}
