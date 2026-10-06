"use client";

import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { useRef, useState, useTransition, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { uploadDocumentAction } from "../actions";

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

const CATEGORY_OPTIONS = Object.entries(DOCUMENT_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

type UploadResult = { fileName: string; error?: string };

type DocumentUploadProps = {
  propertyId: string;
  units: { id: string; unitNumber: string }[];
};

/** Clientseitige Vorprüfung; die verbindliche Validierung passiert serverseitig. */
function precheck(file: File): string | undefined {
  if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
    return "Nur PDF-Dateien sind erlaubt.";
  }
  if (file.size > MAX_SIZE_BYTES) return "Die Datei ist größer als 25 MB.";
  if (file.size === 0) return "Die Datei ist leer.";
  return undefined;
}

export function DocumentUpload({ propertyId, units }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("contract");
  const [unitId, setUnitId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function upload(files: File[]) {
    if (files.length === 0) return;
    setResults([]);

    startTransition(async () => {
      const outcome: UploadResult[] = [];
      for (const file of files) {
        const problem = precheck(file);
        if (problem) {
          outcome.push({ fileName: file.name, error: problem });
          continue;
        }

        const formData = new FormData();
        formData.set("file", file);
        formData.set("propertyId", propertyId);
        formData.set("category", category);
        if (unitId) formData.set("unitId", unitId);

        try {
          const result = await uploadDocumentAction(formData);
          outcome.push(
            result.success
              ? { fileName: file.name }
              : { fileName: file.name, error: result.error },
          );
        } catch {
          outcome.push({ fileName: file.name, error: "Der Upload ist fehlgeschlagen." });
        }
      }
      setResults(outcome);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isPending) return;
    upload(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="upload-category">Kategorie</Label>
          <Select
            id="upload-category"
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
        </div>
        <div className="grid gap-2">
          <Label htmlFor="upload-unit">
            Einheit <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Select
            id="upload-unit"
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
            disabled={isPending}
          >
            <option value="">Gesamtes Objekt</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unitNumber}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging ? "border-primary bg-accent" : "border-input",
          isPending && "opacity-60",
        )}
      >
        {isPending ? (
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <FileUp className="size-8 text-muted-foreground" aria-hidden />
        )}
        <div className="grid gap-1">
          <p className="font-medium">
            {isPending ? "Wird hochgeladen …" : "PDFs hierher ziehen"}
          </p>
          <p className="text-sm text-muted-foreground">
            oder per Klick auswählen · nur PDF · maximal 25 MB pro Datei
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          id="upload-files"
          disabled={isPending}
          onChange={(event) => upload(Array.from(event.target.files ?? []))}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          Dateien auswählen
        </Button>
      </div>

      {results.length > 0 ? (
        <ul className="grid gap-1 text-sm" aria-live="polite">
          {results.map((result, index) => (
            <li key={`${result.fileName}-${index}`} className="flex items-start gap-2">
              {result.error ? (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
              )}
              <span>
                <span className="font-medium">{result.fileName}</span>
                {result.error ? (
                  <span className="text-destructive"> – {result.error}</span>
                ) : (
                  <span className="text-muted-foreground"> – hochgeladen</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
