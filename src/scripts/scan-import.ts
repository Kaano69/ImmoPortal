/**
 * Autonomes Scan- & Importskript für bestehende OneDrive-Ordner und neu gescannte
 * Papierstapel ("Tayyar_Immobilien").
 *
 * Aufruf:
 *   npm run documents:scan -- --source=/pfad/zu/onedrive [--mode=inbox|auto]
 *   npx tsx src/scripts/scan-import.ts --source=/pfad/zu/onedrive --mode=auto
 *
 * Modi:
 *   --mode=inbox (Standard)  Alle Dateien landen im Posteingang (`document_inbox`,
 *                            Datei unter `data/documents/_inbox/`) zur Bestätigung
 *                            im Webinterface (`/inbox`) – derselbe Posteingang, den
 *                            auch der manuelle Upload dort befüllt.
 *   --mode=auto              Bei Erkennungssicherheit über 85 % wird die Datei direkt
 *                            unter `data/documents/[Objekt-ID]/` abgelegt und in
 *                            `documents` registriert. Alles andere landet wie im
 *                            Modus `inbox` im Posteingang (Status "pending").
 *
 * Pro PDF wird zuerst geprüft, ob bereits ein nativer Textlayer vorhanden ist. Fehlt
 * er (reines Scan-PDF), wird Deutsch+Englisch per OCR erkannt (siehe `src/lib/ocr.ts`).
 * Dateiname und erkannter Volltext werden zusammen für die Vorschläge ausgewertet.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documentInbox, documents, properties, type DocumentCategory } from "@/db/schema";
import {
  detectCategoryWithConfidence,
  detectPropertyWithConfidence,
  type MatchableProperty,
} from "@/features/inbox/classify";
import { extractPdfText, terminateOcrWorker } from "@/lib/ocr";
import { deleteDocumentFile, saveDocumentFile } from "@/lib/storage";

/** Unterordner, in dem Posteingangs-Dateien bis zur Ablage-Bestätigung liegen (wie im Web-Posteingang). */
const INBOX_SUBFOLDER = "_inbox";
const AUTO_CONFIDENCE_THRESHOLD = 85;

type Mode = "inbox" | "auto";

type CliArgs = { source: string; mode: Mode };

function printUsage(): void {
  console.log(
    `
Scan- & Importskript für gescannte Dokumente

Verwendung:
  npm run documents:scan -- --source=/pfad/zu/onedrive [--mode=inbox|auto]

Optionen:
  --source=<pfad>   Quellordner, der rekursiv nach PDFs durchsucht wird (Pflicht).
  --mode=inbox      Standard. Alle Dateien landen im Posteingang zur Bestätigung
                     im Webinterface (/inbox).
  --mode=auto       Bei Erkennungssicherheit über ${AUTO_CONFIDENCE_THRESHOLD} % direkte Ablage unter
                     data/documents/[Objekt]; alles andere ebenfalls Posteingang.
`.trim(),
  );
}

function parseArgs(argv: string[]): CliArgs {
  let source: string | undefined;
  let mode: Mode = "inbox";

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith("--source=")) {
      source = arg.slice("--source=".length);
    } else if (arg.startsWith("--mode=")) {
      const value = arg.slice("--mode=".length);
      if (value !== "inbox" && value !== "auto") {
        throw new Error(`Ungültiger Modus "${value}". Erlaubt: inbox, auto.`);
      }
      mode = value;
    } else {
      throw new Error(`Unbekanntes Argument "${arg}". Siehe --help.`);
    }
  }

  if (!source) {
    throw new Error("Bitte einen Quellordner mit --source=/pfad angeben. Siehe --help.");
  }
  return { source, mode };
}

/** Durchsucht einen Ordner rekursiv nach PDF-Dateien, alphabetisch sortiert. */
async function findPdfFiles(root: string): Promise<string[]> {
  const result: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        result.push(fullPath);
      }
    }
  }

  await walk(root);
  return result.sort();
}

async function fileDirectly(input: {
  buffer: Buffer;
  fileName: string;
  propertyId: string;
  category: DocumentCategory;
}): Promise<void> {
  const file = new File([new Uint8Array(input.buffer)], input.fileName, { type: "application/pdf" });
  const filePath = await saveDocumentFile(file, input.propertyId);
  try {
    db.insert(documents)
      .values({
        propertyId: input.propertyId,
        fileName: input.fileName,
        filePath,
        fileSizeBytes: input.buffer.byteLength,
        category: input.category,
        tags: [],
      })
      .run();
  } catch (error) {
    // DB-Eintrag fehlgeschlagen: keine verwaiste Datei zurücklassen.
    await deleteDocumentFile(filePath).catch(() => undefined);
    throw error;
  }
}

async function fileToInbox(input: {
  buffer: Buffer;
  fileName: string;
  extractedText: string;
  detectedPropertyId: string | null;
  detectedCategory: DocumentCategory | null;
}): Promise<void> {
  const file = new File([new Uint8Array(input.buffer)], input.fileName, { type: "application/pdf" });
  const filePath = await saveDocumentFile(file, INBOX_SUBFOLDER);
  try {
    db.insert(documentInbox)
      .values({
        fileName: input.fileName,
        filePath,
        fileSizeBytes: input.buffer.byteLength,
        detectedPropertyId: input.detectedPropertyId,
        detectedCategory: input.detectedCategory,
        extractedText: input.extractedText === "" ? null : input.extractedText,
      })
      .run();
  } catch (error) {
    await deleteDocumentFile(filePath).catch(() => undefined);
    throw error;
  }
}

type ReportRow = {
  fileName: string;
  ocr: string;
  property: string;
  category: string;
  confidence: string;
  outcome: string;
};

/** Gibt die Zeilen als einfache, spaltenbündige Tabelle auf der Konsole aus. */
function printReport(rows: ReportRow[]): void {
  const columns: { key: keyof ReportRow; label: string }[] = [
    { key: "fileName", label: "Datei" },
    { key: "ocr", label: "OCR" },
    { key: "property", label: "Objekt" },
    { key: "category", label: "Kategorie" },
    { key: "confidence", label: "Konfidenz" },
    { key: "outcome", label: "Ergebnis" },
  ];
  const widths = columns.map((column) =>
    Math.max(column.label.length, ...rows.map((row) => row[column.key].length)),
  );
  const renderRow = (values: string[]) =>
    values.map((value, index) => value.padEnd(widths[index])).join("  ");

  console.log(renderRow(columns.map((column) => column.label)));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const row of rows) {
    console.log(renderRow(columns.map((column) => row[column.key])));
  }
}

async function main(): Promise<void> {
  const { source, mode } = parseArgs(process.argv.slice(2));

  const sourceStat = await fs.stat(source).catch(() => null);
  if (!sourceStat?.isDirectory()) {
    throw new Error(`Der Quellordner "${source}" wurde nicht gefunden.`);
  }

  console.log(`Durchsuche "${source}" nach PDF-Dateien …`);
  const pdfFiles = await findPdfFiles(source);
  if (pdfFiles.length === 0) {
    console.log("Keine PDF-Dateien gefunden.");
    return;
  }
  console.log(`${pdfFiles.length} PDF-Datei(en) gefunden. Modus: ${mode}.\n`);

  const activeProperties: MatchableProperty[] = db
    .select({
      id: properties.id,
      name: properties.name,
      street: properties.street,
      city: properties.city,
    })
    .from(properties)
    .where(eq(properties.isArchived, false))
    .all();

  const rows: ReportRow[] = [];
  let autoFiledCount = 0;
  let inboxedCount = 0;
  let failedCount = 0;

  try {
    for (const filePath of pdfFiles) {
      const fileName = path.basename(filePath);

      let buffer: Buffer;
      try {
        buffer = await fs.readFile(filePath);
      } catch (error) {
        failedCount += 1;
        rows.push({
          fileName,
          ocr: "–",
          property: "–",
          category: "–",
          confidence: "–",
          outcome: `Fehler: Datei nicht lesbar (${error instanceof Error ? error.message : "unbekannt"})`,
        });
        continue;
      }

      const extraction = await extractPdfText(buffer);
      const ocrLabel =
        extraction.status === "native"
          ? "übersprungen (hat Text)"
          : extraction.status === "ocr"
            ? `ausgeführt (${extraction.engine})`
            : `fehlgeschlagen${extraction.reason ? ` (${extraction.reason})` : ""}`;

      const categoryDetection = detectCategoryWithConfidence(fileName, extraction.text);
      const propertyDetection = detectPropertyWithConfidence(fileName, extraction.text, activeProperties);
      const propertyName =
        activeProperties.find((property) => property.id === propertyDetection.propertyId)?.name ??
        "nicht erkannt";
      const combinedConfidence = Math.min(
        categoryDetection.confidencePercent,
        propertyDetection.confidencePercent,
      );

      let outcome: string;
      try {
        if (
          mode === "auto" &&
          propertyDetection.propertyId !== null &&
          categoryDetection.category !== "sonstiges" &&
          combinedConfidence > AUTO_CONFIDENCE_THRESHOLD
        ) {
          await fileDirectly({
            buffer,
            fileName,
            propertyId: propertyDetection.propertyId,
            category: categoryDetection.category,
          });
          outcome = "direkt abgelegt";
          autoFiledCount += 1;
        } else {
          await fileToInbox({
            buffer,
            fileName,
            extractedText: extraction.text,
            detectedPropertyId: propertyDetection.propertyId,
            detectedCategory: categoryDetection.category === "sonstiges" ? null : categoryDetection.category,
          });
          outcome = "Posteingang";
          inboxedCount += 1;
        }
      } catch (error) {
        failedCount += 1;
        outcome = `Fehler: ${error instanceof Error ? error.message : "unbekannt"}`;
      }

      rows.push({
        fileName,
        ocr: ocrLabel,
        property: propertyName,
        category: categoryDetection.category,
        confidence: `${combinedConfidence} %`,
        outcome,
      });
    }
  } finally {
    await terminateOcrWorker();
  }

  console.log();
  printReport(rows);
  console.log(
    `\n${pdfFiles.length} Datei(en) verarbeitet: ${autoFiledCount} direkt abgelegt, ${inboxedCount} im Posteingang, ${failedCount} fehlgeschlagen.`,
  );
  if (inboxedCount > 0) {
    console.log("Bitte die Posteingangs-Dateien im Webinterface unter /inbox bestätigen.");
  }
}

main().catch((error: unknown) => {
  console.error("Import fehlgeschlagen:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
