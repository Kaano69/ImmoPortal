import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { Readable } from "node:stream";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { resolveDocumentPath, StorageError } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound(): Response {
  return Response.json({ error: "Dokument nicht gefunden." }, { status: 404 });
}

/** Content-Disposition mit ASCII-Fallback und RFC-5987-kodiertem Originalnamen. */
function inlineDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const document = db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .get();
  if (!document) return notFound();

  let absolutePath: string;
  try {
    absolutePath = resolveDocumentPath(document.filePath);
  } catch (error) {
    if (error instanceof StorageError) return notFound();
    throw error;
  }

  let size: number;
  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) return notFound();
    size = stats.size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return notFound();
    throw error;
  }

  const stream = Readable.toWeb(
    createReadStream(absolutePath),
  ) as unknown as ReadableStream<Uint8Array>;

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": inlineDisposition(document.fileName),
      "Content-Length": String(size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}
