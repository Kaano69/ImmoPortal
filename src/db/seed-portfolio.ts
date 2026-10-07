/**
 * Einmal-Import des realen Portfolios aus „Immobilien_Cockpit_2026_professionell.xlsx“
 * (Blätter „Objekte & Annahmen“ und „Mietplan“, Stand 23.07.2026).
 *
 * Aufruf: `npm run db:seed-real`
 *
 * - Idempotent: Ein Objekt, dessen Name bereits existiert, wird übersprungen.
 *   Bestehende Daten werden nie gelöscht oder verändert.
 * - Jedes Objekt wird in einer eigenen Transaktion angelegt (ganz oder gar nicht).
 * - Beträge stehen als Cent-Integer im Skript; Datumsangaben als ISO-Text.
 *
 * Abbildung auf das Schema:
 * - `additionalCostsCents` = Nebenkosten + Umsatzsteuer, damit „Kalt + Nebenkosten“
 *   der Gesamtzahlung des Mieters aus der Excel-Datei entspricht.
 * - `depositCents` = Kaution Soll (die tatsächlich erhaltene Kaution kennt das Schema nicht).
 */
import { and, eq } from "drizzle-orm";

import { db } from "./index";
import {
  leases,
  properties,
  tenants,
  units,
  type NewUnit,
} from "./schema";

type SeedLease = {
  tenant: { firstName: string; lastName: string };
  startDate: string;
  /** `null` = unbefristet bzw. laufend. */
  endDate: string | null;
  depositCents: number;
};

type SeedUnit = Pick<
  NewUnit,
  "unitNumber" | "type" | "sqm" | "coldRentCents" | "additionalCostsCents"
> & { lease?: SeedLease };

type SeedProperty = {
  name: string;
  street: string;
  zip: string;
  city: string;
  purchaseYear: number;
  totalSqm: number | null;
  marketValueCents: number;
  units: SeedUnit[];
};

const PORTFOLIO: SeedProperty[] = [
  {
    name: "Oberstraße 9, Ludwigshafen",
    street: "Oberstraße 9",
    zip: "67065",
    city: "Ludwigshafen",
    purchaseYear: 2024, // Kaufdatum 08.05.2024
    totalSqm: 341, // Energieausweis; die BKA nutzt 384,17 m²
    marketValueCents: 46_000_000,
    units: [
      {
        unitNumber: "Gewerbe EG",
        type: "commercial",
        sqm: 70,
        coldRentCents: 74_000,
        additionalCostsCents: 14_000 + 16_720, // NK 140,00 + USt 167,20
        lease: {
          tenant: { firstName: "Sezina", lastName: "Balak" }, // Kosmetikstudio
          startDate: "2024-09-01",
          endDate: "2029-08-31",
          depositCents: 222_000,
        },
      },
      {
        unitNumber: "Wohnung EG hinten",
        type: "apartment",
        sqm: 42,
        coldRentCents: 45_000,
        additionalCostsCents: 6_000,
        lease: {
          tenant: { firstName: "Sezina", lastName: "Balak" },
          startDate: "2025-12-01",
          endDate: "2029-11-30",
          depositCents: 0,
        },
      },
      {
        unitNumber: "Wohnung 1. OG",
        type: "apartment",
        sqm: 107.9,
        coldRentCents: 95_000,
        additionalCostsCents: 40_000,
        lease: {
          // Mietvertrag „Slavova und Stoyanov“; ein Mietverhältnis hat im Schema nur einen Mieter.
          tenant: { firstName: "Yuliyana", lastName: "Slavova / Stoyanov" },
          startDate: "2026-04-01",
          endDate: "2028-03-31",
          depositCents: 180_000,
        },
      },
      {
        unitNumber: "Wohnung 2. OG",
        type: "apartment",
        sqm: 85.21,
        // 850 € Warmmietpauschale; Aufteilung 650/200 ist laut Excel eine Modellannahme.
        coldRentCents: 65_000,
        additionalCostsCents: 20_000,
        lease: {
          tenant: { firstName: "Alexandra-Denisa", lastName: "Tanase" },
          startDate: "2025-10-01",
          // Excel „Ende / Planung“: 30.09.2026 – inzwischen überschritten, Vertrag läuft laut Stand weiter.
          endDate: null,
          depositCents: 0,
        },
      },
      {
        unitNumber: "Wohnung DG / 3. OG",
        type: "apartment",
        sqm: 79.06,
        coldRentCents: 0, // frisch renoviert, Zielmiete noch festzulegen
        additionalCostsCents: 0,
      },
    ],
  },
  {
    name: "Rathausgasse 4, Wiesloch",
    street: "Rathausgasse 4",
    zip: "69168",
    city: "Wiesloch",
    purchaseYear: 2025, // laut Auftrag; die Excel nimmt vorläufig den 12.07.2024 an
    totalSqm: null, // Fläche fehlt (Kaufvertrag nachreichen)
    marketValueCents: 23_000_000,
    units: [
      {
        unitNumber: "Gewerbeeinheit",
        type: "commercial",
        sqm: null,
        coldRentCents: 160_000,
        additionalCostsCents: 29_500 + 36_005, // NK 295,00 + USt 360,05
        lease: {
          tenant: { firstName: "Atahan", lastName: "Kurt" },
          startDate: "2024-07-12", // Mietbeginn laut Excel vorläufig
          endDate: null, // Excel: 31.12.2099 = unbefristet
          depositCents: 0,
        },
      },
    ],
  },
  {
    name: "S6/32, Mannheim",
    street: "S6/32",
    zip: "68161",
    city: "Mannheim",
    purchaseYear: 2020, // vorläufig aus dem Grundbuch-Eintrag (14.09.2020)
    totalSqm: null,
    marketValueCents: 12_000_000,
    units: [
      {
        unitNumber: "WE A10",
        type: "apartment",
        sqm: null,
        coldRentCents: 42_120,
        additionalCostsCents: 14_900,
        lease: {
          // Altvertrag, Räumungsverfahren läuft
          tenant: { firstName: "Ulrike", lastName: "Zettelmeyer" },
          startDate: "1994-01-01",
          endDate: "2026-12-31",
          depositCents: 0,
        },
      },
    ],
  },
  {
    name: "Theodor-Heuss-Str. 70, Leimen",
    street: "Theodor-Heuss-Straße 70",
    zip: "69181",
    city: "Leimen",
    purchaseYear: 2026,
    totalSqm: 144,
    marketValueCents: 27_500_000, // Wertermittlung 02.04.2026
    units: [
      {
        unitNumber: "Gesamtes Haus",
        type: "commercial", // gewerbliche Vermietung an eine Firma
        sqm: 144,
        coldRentCents: 135_000,
        additionalCostsCents: 10_000,
        lease: {
          tenant: { firstName: "Firma Kevin", lastName: "Treulieb" },
          startDate: "2026-08-01",
          endDate: null, // Excel: 31.12.2099 = unbefristet; Vertrag liegt nur als Entwurf vor
          depositCents: 0,
        },
      },
    ],
  },
];

function seedProperty(seed: SeedProperty): "created" | "skipped" {
  const existing = db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.name, seed.name))
    .get();
  if (existing) return "skipped";

  db.transaction((tx) => {
    const property = tx
      .insert(properties)
      .values({
        name: seed.name,
        street: seed.street,
        zip: seed.zip,
        city: seed.city,
        purchaseYear: seed.purchaseYear,
        totalSqm: seed.totalSqm,
        marketValueCents: seed.marketValueCents,
      })
      .returning({ id: properties.id })
      .get();

    for (const { lease, ...unitValues } of seed.units) {
      const unit = tx
        .insert(units)
        .values({ ...unitValues, propertyId: property.id, isVacant: lease === undefined })
        .returning({ id: units.id })
        .get();
      if (!lease) continue;

      // Mieter über Namen wiederverwenden (z. B. Balak mietet zwei Einheiten).
      const knownTenant = tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(
            eq(tenants.firstName, lease.tenant.firstName),
            eq(tenants.lastName, lease.tenant.lastName),
          ),
        )
        .get();
      const tenantId =
        knownTenant?.id ??
        tx.insert(tenants).values(lease.tenant).returning({ id: tenants.id }).get().id;

      tx.insert(leases)
        .values({
          unitId: unit.id,
          tenantId,
          startDate: lease.startDate,
          endDate: lease.endDate,
          depositCents: lease.depositCents,
          isActive: true,
        })
        .run();
    }
  });
  return "created";
}

for (const property of PORTFOLIO) {
  const result = seedProperty(property);
  const leaseCount = property.units.filter((unit) => unit.lease).length;
  console.log(
    result === "created"
      ? `✓ ${property.name}: ${property.units.length} Einheit(en), ${leaseCount} Mietvertrag/-verträge angelegt`
      : `– ${property.name}: existiert bereits, übersprungen`,
  );
}
