import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PDFParse } from "pdf-parse";
import { createWorker, type Worker } from "tesseract.js";

/** Sprachen für die Texterkennung, in der Reihenfolge, wie sie an Tesseract übergeben werden. */
const TESSERACT_LANGUAGES = ["deu", "eng"] as const;
const TESSERACT_LANG_SPEC = TESSERACT_LANGUAGES.join("+");

const TESSDATA_DIR = path.join(process.cwd(), "data", "tessdata");
/** „fast“-Variante der offiziellen Tesseract-Sprachdaten: deutlich kleiner als die Standardmodelle, für Dokumentenscans ausreichend genau. */
const TESSDATA_BASE_URL = "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main";

/** Ab dieser Anzahl bedeutungstragender Zeichen (ohne Whitespace) gilt ein PDF als „hat bereits Text“. */
const MIN_NATIVE_TEXT_CHARS = 20;
/** Schutz gegen pathologisch große Scans: mehr Seiten werden nicht per OCR verarbeitet. */
const MAX_OCR_PAGES = 20;
const OCR_RENDER_SCALE = 2.5;

export type OcrEngine = "tesseract-cli" | "tesseract.js";

export type TextExtractionResult = {
  text: string;
  pageCount: number;
  status: "native" | "ocr" | "failed";
  engine?: OcrEngine;
  reason?: string;
};

// ---------------------------------------------------------------------------
// Sprachdaten-Cache (einmalig heruntergeladen, danach offline nutzbar – von
// beiden Engines gemeinsam verwendet: System-Tesseract liest `.traineddata`
// direkt, tesseract.js wird unten mit `gzip: false` auf dieselben Dateien verwiesen).
// ---------------------------------------------------------------------------

let tessdataReady: Promise<string> | null = null;

async function ensureTessdata(): Promise<string> {
  tessdataReady ??= (async () => {
    await fs.mkdir(TESSDATA_DIR, { recursive: true });
    for (const lang of TESSERACT_LANGUAGES) {
      const file = path.join(TESSDATA_DIR, `${lang}.traineddata`);
      const exists = await fs
        .access(file)
        .then(() => true)
        .catch(() => false);
      if (exists) continue;

      const response = await fetch(`${TESSDATA_BASE_URL}/${lang}.traineddata`);
      if (!response.ok) {
        throw new Error(
          `Sprachdaten für "${lang}" konnten nicht geladen werden (HTTP ${response.status}).`,
        );
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(file, buffer);
    }
    return TESSDATA_DIR;
  })();
  return tessdataReady;
}

// ---------------------------------------------------------------------------
// Engine 1: Systemwerkzeug `tesseract` (schneller, aber nicht garantiert vorhanden)
// ---------------------------------------------------------------------------

let systemTesseractAvailable: boolean | undefined;

function hasSystemTesseract(): boolean {
  if (systemTesseractAvailable === undefined) {
    const result = spawnSync("tesseract", ["--version"], { stdio: "ignore" });
    systemTesseractAvailable = !result.error && result.status === 0;
  }
  return systemTesseractAvailable;
}

function ocrWithSystemTesseract(imagePath: string, tessdataDir: string): string {
  const result = spawnSync("tesseract", [imagePath, "stdout", "-l", TESSERACT_LANG_SPEC], {
    env: { ...process.env, TESSDATA_PREFIX: tessdataDir },
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr?.toString().trim() || "Das Systemwerkzeug „tesseract“ ist fehlgeschlagen.",
    );
  }
  return result.stdout;
}

// ---------------------------------------------------------------------------
// Engine 2: `tesseract.js` – reiner npm-Fallback, kein Systemwerkzeug nötig.
// Ein Worker wird für den gesamten Lauf wiederverwendet (siehe `terminateOcrWorker`).
// ---------------------------------------------------------------------------

let jsWorker: Promise<Worker> | null = null;

function getTesseractJsWorker(tessdataDir: string): Promise<Worker> {
  jsWorker ??= createWorker(TESSERACT_LANG_SPEC, 1, {
    langPath: tessdataDir,
    cachePath: tessdataDir,
    gzip: false,
  });
  return jsWorker;
}

/** Beendet den wiederverwendeten tesseract.js-Worker; am Ende eines Skript-Laufs aufrufen. */
export async function terminateOcrWorker(): Promise<void> {
  if (!jsWorker) return;
  const worker = await jsWorker;
  jsWorker = null;
  await worker.terminate();
}

async function ocrWithTesseractJs(imagePath: string, tessdataDir: string): Promise<string> {
  const worker = await getTesseractJsWorker(tessdataDir);
  const { data } = await worker.recognize(imagePath);
  return data.text;
}

// ---------------------------------------------------------------------------
// Haupteinstieg
// ---------------------------------------------------------------------------

/**
 * Extrahiert den Volltext eines PDFs: zuerst wird geprüft, ob bereits ein nativer
 * Textlayer vorhanden ist (kein Scan). Ist keiner vorhanden, werden die Seiten
 * gerendert (rein npm-basiert über `pdf-parse`, kein Systemwerkzeug nötig) und per
 * OCR (Deutsch + Englisch) erkannt – über das Systemwerkzeug `tesseract`, falls
 * vorhanden, sonst über `tesseract.js`.
 */
export async function extractPdfText(buffer: Buffer): Promise<TextExtractionResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const meaningfulChars = textResult.text.replace(/\s+/g, "").length;
    if (meaningfulChars >= MIN_NATIVE_TEXT_CHARS) {
      return { text: textResult.text, pageCount: textResult.pages.length, status: "native" };
    }

    const screenshot = await parser.getScreenshot({ scale: OCR_RENDER_SCALE, first: MAX_OCR_PAGES });
    if (screenshot.pages.length === 0) {
      return { text: "", pageCount: 0, status: "failed", reason: "Das PDF enthält keine Seiten." };
    }

    const tessdataDir = await ensureTessdata();
    const engine: OcrEngine = hasSystemTesseract() ? "tesseract-cli" : "tesseract.js";

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "immo-ocr-"));
    try {
      const pageTexts: string[] = [];
      for (const page of screenshot.pages) {
        const imagePath = path.join(tempDir, `page-${page.pageNumber}.png`);
        await fs.writeFile(imagePath, page.data);
        pageTexts.push(
          engine === "tesseract-cli"
            ? ocrWithSystemTesseract(imagePath, tessdataDir)
            : await ocrWithTesseractJs(imagePath, tessdataDir),
        );
      }
      return {
        text: pageTexts.join("\n\n"),
        pageCount: screenshot.pages.length,
        status: "ocr",
        engine,
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    return {
      text: "",
      pageCount: 0,
      status: "failed",
      reason: error instanceof Error ? error.message : "Unbekannter Fehler bei der Texterkennung.",
    };
  } finally {
    await parser.destroy();
  }
}
