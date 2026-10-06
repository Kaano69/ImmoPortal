import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DOCUMENTS_DIR = path.join(DATA_DIR, "documents");
const DB_FILE = path.join(DATA_DIR, "cockpit.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

type Db = BetterSQLite3Database<typeof schema>;

function createDb(): Db {
  // Zero-Config: Ordner beim ersten Start automatisch anlegen.
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
  }

  const sqlite = new Database(DB_FILE);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const instance = drizzle(sqlite, { schema });

  // Anstehende Migrationen beim Start automatisch anwenden.
  migrate(instance, { migrationsFolder: MIGRATIONS_DIR });

  return instance;
}

// Im Dev-Modus würde Hot Reload sonst bei jeder Änderung neue Connections öffnen.
const globalForDb = globalThis as unknown as { cockpitDb?: Db };

export const db: Db = globalForDb.cockpitDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.cockpitDb = db;
}

export const DOCUMENTS_PATH = DOCUMENTS_DIR;
