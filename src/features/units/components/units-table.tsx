import { DoorOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DepositStatus } from "@/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreateLeaseDialog,
  DepositDialog,
  EndLeaseDialog,
  type ProofDocumentOption,
  type TenantOption,
} from "@/features/leases/components/lease-dialogs";
import type { UnitDetail } from "@/features/properties/queries";
import { formatCentsToEuro, formatDate, formatSqm } from "@/lib/formatters";
import { UNIT_TYPE_LABELS } from "@/lib/labels";

import { EditUnitDialog } from "./unit-dialogs";

function centsToInput(cents: number): string {
  return cents === 0 ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

/** Grün bei vollständig nachgewiesener Kaution, Gelb bei Status ohne Nachweis, Rot ohne Kaution. */
function depositBadge(
  status: DepositStatus,
  hasProof: boolean,
): { variant: "success" | "warning" | "destructive"; label: string } {
  if (status === "missing") return { variant: "destructive", label: "Keine Kaution" };
  if (!hasProof) return { variant: "warning", label: "Ohne Nachweis" };
  return { variant: "success", label: "Nachgewiesen" };
}

export function UnitsTable({
  units,
  tenants,
  proofDocuments,
}: {
  units: UnitDetail[];
  tenants: TenantOption[];
  proofDocuments: ProofDocumentOption[];
}) {
  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <DoorOpen className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Noch keine Einheiten angelegt</p>
        <p className="text-sm text-muted-foreground">
          Lege über „Einheit anlegen“ die erste Einheit dieses Objekts an.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Einheit</TableHead>
          <TableHead className="text-right">Fläche</TableHead>
          <TableHead className="text-right">Kaltmiete</TableHead>
          <TableHead className="text-right">Warmmiete</TableHead>
          <TableHead>Mieter</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Kaution</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Aktionen</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units.map((unit) => (
          <TableRow key={unit.id}>
            <TableCell>
              <div className="font-medium">{unit.unitNumber}</div>
              <div className="text-xs text-muted-foreground">{UNIT_TYPE_LABELS[unit.type]}</div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {unit.sqm === null ? "–" : formatSqm(unit.sqm)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCentsToEuro(unit.coldRentCents)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCentsToEuro(unit.coldRentCents + unit.additionalCostsCents)}
            </TableCell>
            <TableCell>
              {unit.activeLease ? (
                <>
                  <div>{unit.activeLease.tenantName}</div>
                  <div className="text-xs text-muted-foreground">
                    seit {formatDate(unit.activeLease.startDate)}
                    {unit.activeLease.endDate
                      ? ` · bis ${formatDate(unit.activeLease.endDate)}`
                      : ""}
                  </div>
                </>
              ) : (
                "–"
              )}
            </TableCell>
            <TableCell>
              <Badge variant={unit.activeLease ? "success" : "warning"}>
                {unit.activeLease ? "Vermietet" : "Leerstand"}
              </Badge>
            </TableCell>
            <TableCell>
              {unit.activeLease ? (
                (() => {
                  const lease = unit.activeLease;
                  const hasProof = lease.depositProofDocumentId !== null;
                  const badge = depositBadge(lease.depositStatus, hasProof);
                  return (
                    <div className="grid gap-1">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatCentsToEuro(lease.depositReceivedCents)} von{" "}
                        {formatCentsToEuro(lease.depositCents)}
                      </span>
                    </div>
                  );
                })()
              ) : (
                "–"
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                {unit.activeLease ? (
                  <>
                    <DepositDialog
                      leaseId={unit.activeLease.id}
                      tenantName={unit.activeLease.tenantName}
                      depositCents={unit.activeLease.depositCents}
                      defaults={{
                        status: unit.activeLease.depositStatus,
                        receivedAmountCents: unit.activeLease.depositReceivedCents,
                        bankAccount: unit.activeLease.depositBankAccount,
                        proofDocumentId: unit.activeLease.depositProofDocumentId,
                      }}
                      proofDocuments={proofDocuments}
                    />
                    <EndLeaseDialog
                      leaseId={unit.activeLease.id}
                      tenantName={unit.activeLease.tenantName}
                    />
                  </>
                ) : (
                  <CreateLeaseDialog
                    unitId={unit.id}
                    unitLabel={unit.unitNumber}
                    tenants={tenants}
                  />
                )}
                <EditUnitDialog
                  unitId={unit.id}
                  defaults={{
                    unitNumber: unit.unitNumber,
                    type: unit.type,
                    sqm: unit.sqm === null ? "" : String(unit.sqm).replace(".", ","),
                    coldRent: centsToInput(unit.coldRentCents),
                    additionalCosts: centsToInput(unit.additionalCostsCents),
                  }}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
