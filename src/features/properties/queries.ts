import { asc, count, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  documents,
  properties,
  tenants,
  type DocumentCategory,
  type Property,
  type UnitType,
} from "@/db/schema";

export type PropertyRow = {
  id: string;
  name: string;
  street: string;
  zip: string;
  city: string;
  unitCount: number;
  /** Eingetragene Gesamtfläche, sonst Summe der Einheitsflächen, sonst `null`. */
  totalSqm: number | null;
};

export type DashboardData = {
  properties: PropertyRow[];
  /** Soll-Kaltmiete pro Monat aus allen Einheiten mit aktivem Mietvertrag. */
  targetColdRentCents: number;
  totalUnits: number;
  rentedUnits: number;
  vacantUnits: number;
  /** Leerstandsquote in Prozent (0–100), bezogen auf die Einheitenanzahl. */
  vacancyRatePercent: number;
  documentCount: number;
};

/**
 * Lädt alle Liegenschaften samt Einheiten und Mietverträgen und leitet die
 * Dashboard-Kennzahlen ab. Eine Einheit gilt als vermietet, wenn sie einen
 * aktiven Mietvertrag hat (Mietverträge sind die maßgebliche Quelle).
 */
export async function getDashboardData(): Promise<DashboardData> {
  const rows = await db.query.properties.findMany({
    orderBy: [asc(properties.name)],
    with: { units: { with: { leases: true } } },
  });

  let targetColdRentCents = 0;
  let totalUnits = 0;
  let rentedUnits = 0;

  const propertyRows = rows.map<PropertyRow>((property) => {
    let unitSqm = 0;
    let hasUnitSqm = false;

    for (const unit of property.units) {
      totalUnits += 1;
      if (unit.sqm !== null) {
        unitSqm += unit.sqm;
        hasUnitSqm = true;
      }
      if (unit.leases.some((lease) => lease.isActive)) {
        rentedUnits += 1;
        targetColdRentCents += unit.coldRentCents;
      }
    }

    return {
      id: property.id,
      name: property.name,
      street: property.street,
      zip: property.zip,
      city: property.city,
      unitCount: property.units.length,
      totalSqm: property.totalSqm ?? (hasUnitSqm ? unitSqm : null),
    };
  });

  const vacantUnits = totalUnits - rentedUnits;
  const documentCount =
    db.select({ value: count() }).from(documents).get()?.value ?? 0;

  return {
    properties: propertyRows,
    targetColdRentCents,
    totalUnits,
    rentedUnits,
    vacantUnits,
    vacancyRatePercent: totalUnits === 0 ? 0 : (vacantUnits / totalUnits) * 100,
    documentCount,
  };
}

export type UnitDetail = {
  id: string;
  unitNumber: string;
  type: UnitType;
  sqm: number | null;
  coldRentCents: number;
  additionalCostsCents: number;
  activeLease: {
    id: string;
    tenantName: string;
    startDate: string;
    endDate: string | null;
  } | null;
};

export type DocumentDetail = {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  category: DocumentCategory;
  createdAt: string;
  unitNumber: string | null;
};

export type PropertyDetail = {
  property: Property;
  units: UnitDetail[];
  documents: DocumentDetail[];
  tenants: { id: string; name: string }[];
};

export async function getPropertyDetail(id: string): Promise<PropertyDetail | null> {
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, id),
    with: {
      units: { with: { leases: { with: { tenant: true } } } },
      documents: { with: { unit: true } },
    },
  });
  if (!property) return null;

  const unitDetails = property.units
    .map<UnitDetail>((unit) => {
      const lease = unit.leases.find((l) => l.isActive);
      return {
        id: unit.id,
        unitNumber: unit.unitNumber,
        type: unit.type,
        sqm: unit.sqm,
        coldRentCents: unit.coldRentCents,
        additionalCostsCents: unit.additionalCostsCents,
        activeLease: lease
          ? {
              id: lease.id,
              tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`.trim(),
              startDate: lease.startDate,
              endDate: lease.endDate,
            }
          : null,
      };
    })
    .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, "de", { numeric: true }));

  const documentDetails = property.documents
    .map<DocumentDetail>((document) => ({
      id: document.id,
      fileName: document.fileName,
      fileSizeBytes: document.fileSizeBytes,
      category: document.category,
      createdAt: document.createdAt,
      unitNumber: document.unit?.unitNumber ?? null,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const allTenants = db
    .select()
    .from(tenants)
    .orderBy(asc(tenants.lastName), asc(tenants.firstName))
    .all()
    .map((tenant) => ({
      id: tenant.id,
      name: `${tenant.firstName} ${tenant.lastName}`.trim(),
    }));

  const { units: _units, documents: _documents, ...propertyRow } = property;
  return {
    property: propertyRow,
    units: unitDetails,
    documents: documentDetails,
    tenants: allTenants,
  };
}
