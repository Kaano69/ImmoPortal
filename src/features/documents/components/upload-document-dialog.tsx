"use client";

import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DocumentCategory } from "@/db/schema";

import { DocumentUpload } from "./document-upload";

export function UploadDocumentDialog({
  propertyId,
  units,
  defaultCategory,
  defaultUnitId,
}: {
  propertyId: string;
  units: { id: string; unitNumber: string }[];
  defaultCategory?: DocumentCategory;
  defaultUnitId?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload />
          Dokument hochladen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Dokument hochladen</DialogTitle>
          <DialogDescription>
            Wähle Kategorie und optional eine Einheit, dann ziehe die PDFs in das Feld.
          </DialogDescription>
        </DialogHeader>
        {/* Der Inhalt wird beim Schließen entfernt; Auswahl und Ergebnisliste starten so jedes Mal neu. */}
        <DocumentUpload
          propertyId={propertyId}
          units={units}
          defaultCategory={defaultCategory}
          defaultUnitId={defaultUnitId}
        />
      </DialogContent>
    </Dialog>
  );
}
