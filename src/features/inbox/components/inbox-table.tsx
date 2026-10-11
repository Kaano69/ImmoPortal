"use client";

import { Check, Inbox, Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatFileSize } from "@/lib/formatters";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/labels";

import { confirmInboxItemAction, deleteInboxItemAction } from "../actions";
import type { InboxItem, InboxPropertyOption } from "../queries";

const CATEGORY_OPTIONS = Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function InboxRow({
  item,
  properties,
}: {
  item: InboxItem;
  properties: InboxPropertyOption[];
}) {
  const [propertyId, setPropertyId] = useState(item.detectedPropertyId ?? "");
  const [category, setCategory] = useState<string>(item.detectedCategory ?? "sonstiges");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    if (!propertyId) {
      setError("Bitte ein Objekt wählen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", item.id);
      formData.set("propertyId", propertyId);
      formData.set("category", category);
      const result = await confirmInboxItemAction(formData);
      if (!result.success) setError(result.error);
    });
  }

  function discard() {
    if (
      !window.confirm(
        `„${item.fileName}“ wirklich aus dem Posteingang entfernen? Die Datei wird gelöscht.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteInboxItemAction(item.id);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell className="max-w-72 min-w-48 whitespace-normal">
        <div className="truncate font-medium" title={item.fileName}>
          {item.fileName}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(item.fileSizeBytes)} · {formatDate(item.createdAt)}
        </div>
      </TableCell>
      <TableCell className="min-w-44">
        <Select
          aria-label="Objekt"
          value={propertyId}
          onChange={(event) => setPropertyId(event.target.value)}
          disabled={isPending}
        >
          <option value="">Objekt wählen …</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </Select>
        <p
          className={
            item.detectedPropertyName
              ? "mt-1 text-xs text-muted-foreground"
              : "mt-1 text-xs text-amber-700 dark:text-amber-400"
          }
        >
          {item.detectedPropertyName
            ? `Erkannt: ${item.detectedPropertyName}`
            : "Objekt nicht eindeutig erkannt"}
        </p>
      </TableCell>
      <TableCell className="min-w-56">
        <Select
          aria-label="Kategorie"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={isPending}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <Button type="button" size="sm" disabled={isPending} onClick={confirm}>
              {isPending ? <Loader2 className="animate-spin" /> : <Check />}
              Ablage bestätigen
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${item.fileName} verwerfen`}
              disabled={isPending}
              onClick={discard}
            >
              <Trash2 />
            </Button>
          </div>
          {error ? (
            <span role="alert" className="text-xs text-destructive">
              {error}
            </span>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function InboxTable({
  items,
  properties,
}: {
  items: InboxItem[];
  properties: InboxPropertyOption[];
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Der Posteingang ist leer</p>
        <p className="text-sm text-muted-foreground">
          Ziehe oben gescannte PDFs hinein, um sie einzupflegen.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Datei</TableHead>
          <TableHead>Objekt</TableHead>
          <TableHead>Kategorie</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Aktionen</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <InboxRow key={item.id} item={item} properties={properties} />
        ))}
      </TableBody>
    </Table>
  );
}
