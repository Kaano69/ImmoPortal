import { randomUUID } from "node:crypto";

import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Konventionen
//  - IDs: UUID als Text
//  - Geldbeträge: Integer in Cent
//  - Datumsangaben: ISO-Text (YYYY-MM-DD bzw. ISO-8601 für Zeitstempel)
//  - Booleans: Integer (0/1), von Drizzle als boolean gemappt
// ---------------------------------------------------------------------------

export const UNIT_TYPES = ["apartment", "commercial", "parking"] as const;
export const DOCUMENT_CATEGORIES = [
  "contract",
  "invoice",
  "protocol",
  "other",
] as const;
export const TRANSACTION_TYPES = [
  "rent_incoming",
  "maintenance",
  "utility_cost",
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`);

// ---------------------------------------------------------------------------
// Tabellen
// ---------------------------------------------------------------------------

export const properties = sqliteTable("properties", {
  id: id(),
  name: text("name").notNull(),
  street: text("street").notNull(),
  zip: text("zip").notNull(),
  city: text("city").notNull(),
  buildYear: integer("build_year"),
  purchaseYear: integer("purchase_year"),
  totalSqm: real("total_sqm"),
  createdAt: createdAt(),
});

export const units = sqliteTable(
  "units",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    unitNumber: text("unit_number").notNull(),
    type: text("type", { enum: UNIT_TYPES }).notNull(),
    sqm: real("sqm"),
    coldRentCents: integer("cold_rent_cents").notNull().default(0),
    additionalCostsCents: integer("additional_costs_cents")
      .notNull()
      .default(0),
    isVacant: integer("is_vacant", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [
    uniqueIndex("units_property_id_unit_number_idx").on(
      t.propertyId,
      t.unitNumber,
    ),
  ],
);

export const tenants = sqliteTable("tenants", {
  id: id(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: createdAt(),
});

export const leases = sqliteTable(
  "leases",
  {
    id: id(),
    // Mietverhältnisse sind rechtlich relevante Historie: kein Cascade-Delete.
    unitId: text("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    depositCents: integer("deposit_cents").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [
    index("leases_unit_id_idx").on(t.unitId),
    index("leases_tenant_id_idx").on(t.tenantId),
    // Pro Einheit darf es höchstens einen aktiven Mietvertrag geben.
    uniqueIndex("leases_one_active_per_unit_idx")
      .on(t.unitId)
      .where(sql`${t.isActive} = 1`),
    check(
      "leases_end_after_start_check",
      sql`${t.endDate} IS NULL OR ${t.endDate} >= ${t.startDate}`,
    ),
  ],
);

export const documents = sqliteTable(
  "documents",
  {
    id: id(),
    propertyId: text("property_id").references(() => properties.id, {
      onDelete: "cascade",
    }),
    unitId: text("unit_id").references(() => units.id, {
      onDelete: "cascade",
    }),
    fileName: text("file_name").notNull(),
    filePath: text("file_path").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    category: text("category", { enum: DOCUMENT_CATEGORIES })
      .notNull()
      .default("other"),
    createdAt: createdAt(),
  },
  (t) => [
    index("documents_property_id_idx").on(t.propertyId),
    index("documents_unit_id_idx").on(t.unitId),
  ],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    // Buchungen bleiben als Finanzhistorie erhalten: kein Cascade-Delete.
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    unitId: text("unit_id").references(() => units.id, {
      onDelete: "set null",
    }),
    amountCents: integer("amount_cents").notNull(),
    type: text("type", { enum: TRANSACTION_TYPES }).notNull(),
    dueDate: text("due_date").notNull(),
    paidAt: text("paid_at"),
  },
  (t) => [
    index("transactions_property_id_idx").on(t.propertyId),
    index("transactions_unit_id_idx").on(t.unitId),
    index("transactions_due_date_idx").on(t.dueDate),
  ],
);

// ---------------------------------------------------------------------------
// Relationen
// ---------------------------------------------------------------------------

export const propertiesRelations = relations(properties, ({ many }) => ({
  units: many(units),
  documents: many(documents),
  transactions: many(transactions),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  property: one(properties, {
    fields: [units.propertyId],
    references: [properties.id],
  }),
  leases: many(leases),
  documents: many(documents),
  transactions: many(transactions),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  leases: many(leases),
}));

export const leasesRelations = relations(leases, ({ one }) => ({
  unit: one(units, {
    fields: [leases.unitId],
    references: [units.id],
  }),
  tenant: one(tenants, {
    fields: [leases.tenantId],
    references: [tenants.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  property: one(properties, {
    fields: [documents.propertyId],
    references: [properties.id],
  }),
  unit: one(units, {
    fields: [documents.unitId],
    references: [units.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  property: one(properties, {
    fields: [transactions.propertyId],
    references: [properties.id],
  }),
  unit: one(units, {
    fields: [transactions.unitId],
    references: [units.id],
  }),
}));

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Lease = typeof leases.$inferSelect;
export type NewLease = typeof leases.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
