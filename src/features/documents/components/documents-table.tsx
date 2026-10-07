import { Download, ExternalLink } from "lucide-react";

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
import type { DocumentDetail } from "@/features/properties/queries";
import { formatDate, formatFileSize } from "@/lib/formatters";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/labels";

import { DeleteDocumentButton } from "./delete-document-button";

export function DocumentsTable({ documents }: { documents: DocumentDetail[] }) {
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
            <TableCell className="max-w-72 whitespace-normal">
              <div className="truncate font-medium" title={document.fileName}>
                {document.fileName}
              </div>
              {document.tags.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {document.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{DOCUMENT_CATEGORY_LABELS[document.category]}</Badge>
            </TableCell>
            <TableCell>
              {document.unitNumber ? (
                <Badge variant="default">{document.unitNumber}</Badge>
              ) : (
                <Badge variant="outline">Gesamtes Objekt</Badge>
              )}
            </TableCell>
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
