import { Download, ExternalLink, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DocumentCategory } from "@/db/schema";
import type { DocumentDetail } from "@/features/properties/queries";
import { formatDate, formatFileSize } from "@/lib/formatters";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/labels";

import { DeleteDocumentButton } from "./delete-document-button";

const CATEGORY_VARIANT: Record<DocumentCategory, "default" | "warning" | "secondary" | "outline"> = {
  contract: "default",
  invoice: "warning",
  protocol: "secondary",
  other: "outline",
};

export function DocumentsTable({ documents }: { documents: DocumentDetail[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <FileText className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Noch keine Dokumente archiviert</p>
        <p className="text-sm text-muted-foreground">
          Ziehe oben eine PDF in das Upload-Feld.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Dateiname</TableHead>
          <TableHead>Kategorie</TableHead>
          <TableHead>Einheit</TableHead>
          <TableHead className="text-right">Größe</TableHead>
          <TableHead>Hochgeladen</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Aktionen</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((document) => (
          <TableRow key={document.id}>
            <TableCell className="max-w-72 truncate font-medium" title={document.fileName}>
              {document.fileName}
            </TableCell>
            <TableCell>
              <Badge variant={CATEGORY_VARIANT[document.category]}>
                {DOCUMENT_CATEGORY_LABELS[document.category]}
              </Badge>
            </TableCell>
            <TableCell>{document.unitNumber ?? "–"}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatFileSize(document.fileSizeBytes)}
            </TableCell>
            <TableCell>{formatDate(document.createdAt)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/documents/${document.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    Öffnen
                  </a>
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label={`${document.fileName} herunterladen`}>
                  <a href={`/api/documents/${document.id}`} download={document.fileName}>
                    <Download />
                  </a>
                </Button>
                <DeleteDocumentButton id={document.id} fileName={document.fileName} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
