import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;

const DOCUMENTS_ROOT = path.join(process.cwd(), "data", "documents");
const PDF_MAGIC = "%PDF-";
const SUBFOLDER_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_FILE_NAME_LENGTH = 120;

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

/** Entfernt Pfadanteile und Sonderzeichen, damit der Name im Dateisystem unbedenklich ist. */
function sanitizeFileName(name: string): string {
  const base = path.basename(name.replaceAll("\\", "/"));
  const cleaned = base
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .replace(/^\.+/, "")
    .trim();
  const limited = cleaned.slice(-MAX_FILE_NAME_LENGTH);
  return limited.length > 0 ? limited : "dokument.pdf";
}

/**
 * Löst einen relativen Dokumentpfad (relativ zu `./data/documents`) in einen
 * absoluten Pfad auf und stellt sicher, dass er den Dokumentenordner nicht verlässt.
 */
export function resolveDocumentPath(relativePath: string): string {
  if (relativePath.includes("\0")) {
    throw new StorageError("Ungültiger Dateipfad.");
  }
  const absolute = path.resolve(DOCUMENTS_ROOT, relativePath);
  if (!absolute.startsWith(DOCUMENTS_ROOT + path.sep)) {
    throw new StorageError("Ungültiger Dateipfad.");
  }
  return absolute;
}

/**
 * Validiert ein PDF (Typ, Größe, Dateisignatur) und speichert es unter
 * `./data/documents/[subfolder]/[uuid]-[filename]`.
 * Gibt den Pfad relativ zu `./data/documents` zurück (`[subfolder]/[uuid]-[filename]`).
 */
export async function saveDocumentFile(
  file: File,
  subfolder: string,
): Promise<string> {
  if (!SUBFOLDER_PATTERN.test(subfolder)) {
    throw new StorageError("Ungültiger Zielordner.");
  }
  if (file.size === 0) {
    throw new StorageError("Die Datei ist leer.");
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new StorageError("Die Datei ist größer als 25 MB.");
  }
  if (
    file.type !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new StorageError("Nur PDF-Dateien sind erlaubt.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Dem vom Client gemeldeten MIME-Typ nicht vertrauen: Dateisignatur prüfen.
  if (buffer.subarray(0, PDF_MAGIC.length).toString("latin1") !== PDF_MAGIC) {
    throw new StorageError("Die Datei ist kein gültiges PDF.");
  }

  const relativePath = path.posix.join(
    subfolder,
    `${randomUUID()}-${sanitizeFileName(file.name)}`,
  );
  const absolutePath = resolveDocumentPath(relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  // `wx`: niemals eine bestehende Datei überschreiben.
  await fs.writeFile(absolutePath, buffer, { flag: "wx" });

  return relativePath;
}

/**
 * Verschiebt eine bereits gespeicherte Dokumentdatei in einen anderen Unterordner
 * (z. B. vom Posteingang `_inbox` in den Objektordner `[propertyId]`), ohne sie neu zu
 * validieren. Der Dateiname (inkl. UUID-Präfix) bleibt erhalten, damit er eindeutig bleibt.
 */
export async function moveDocumentFile(
  relativePath: string,
  newSubfolder: string,
): Promise<string> {
  if (!SUBFOLDER_PATTERN.test(newSubfolder)) {
    throw new StorageError("Ungültiger Zielordner.");
  }
  const sourceAbsolute = resolveDocumentPath(relativePath);
  const newRelativePath = path.posix.join(newSubfolder, path.basename(relativePath));
  const newAbsolute = resolveDocumentPath(newRelativePath);

  await fs.mkdir(path.dirname(newAbsolute), { recursive: true });
  await fs.rename(sourceAbsolute, newAbsolute);

  return newRelativePath;
}

/** Löscht den gesamten Ordner `./data/documents/[subfolder]` samt Inhalt (z. B. beim Löschen eines Objekts). */
export async function deleteDocumentFolder(subfolder: string): Promise<void> {
  if (!SUBFOLDER_PATTERN.test(subfolder)) {
    throw new StorageError("Ungültiger Zielordner.");
  }
  await fs.rm(resolveDocumentPath(subfolder), { recursive: true, force: true });
}

/** Löscht eine Dokumentdatei. Eine bereits fehlende Datei ist kein Fehler. */
export async function deleteDocumentFile(relativePath: string): Promise<void> {
  const absolutePath = resolveDocumentPath(relativePath);
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}
