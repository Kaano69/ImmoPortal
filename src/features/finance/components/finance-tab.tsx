import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { currentYearMonth, shiftYearMonth } from "@/lib/dates";
import { formatCentsToEuro, formatDate, formatYearMonth } from "@/lib/formatters";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

import type { MonthlyCashflow, PaymentItem, RentLine } from "../types";
import {
  DeleteTransactionButton,
  MarkRentPaidButton,
  MarkTransactionPaidButton,
  UndoPaymentButton,
} from "./payment-buttons";
import { RecordTransactionDialog } from "./record-transaction-dialog";

function monthHref(propertyId: string, yearMonth: string): string {
  return `/properties/${propertyId}?tab=finance&month=${yearMonth}`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-8 text-center whitespace-normal text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

function RentStatus({ line, isPastMonth }: { line: RentLine; isPastMonth: boolean }) {
  if (line.status === "paid") {
    return (
      <Badge variant="success">
        Bezahlt{line.lastPaidAt ? ` am ${formatDate(line.lastPaidAt)}` : ""}
      </Badge>
    );
  }
  if (line.status === "partial") {
    return (
      <Badge variant="warning">Teilzahlung ({formatCentsToEuro(line.paidCents)})</Badge>
    );
  }
  return isPastMonth ? (
    <Badge variant="destructive">Überfällig</Badge>
  ) : (
    <Badge variant="secondary">Offen</Badge>
  );
}

function PaymentStatus({ item }: { item: PaymentItem }) {
  if (item.paidAt) return <Badge variant="success">Bezahlt am {formatDate(item.paidAt)}</Badge>;
  return item.overdue ? (
    <Badge variant="destructive">Überfällig</Badge>
  ) : (
    <Badge variant="secondary">Offen</Badge>
  );
}

function paymentLabel(item: PaymentItem): string {
  return `${TRANSACTION_TYPE_LABELS[item.type]}${item.unitNumber ? ` ${item.unitNumber}` : ""} vom ${formatDate(item.dueDate)}`;
}

export function FinanceTab({
  propertyId,
  cashflow,
  units,
}: {
  propertyId: string;
  cashflow: MonthlyCashflow;
  units: { id: string; unitNumber: string }[];
}) {
  const { yearMonth } = cashflow;
  const isPastMonth = yearMonth < currentYearMonth();
  const nextMonth = shiftYearMonth(yearMonth, 1);
  const prevMonth = shiftYearMonth(yearMonth, -1);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Monat wechseln" className="flex items-center gap-2">
          <Link
            href={monthHref(propertyId, prevMonth)}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            aria-label={`Vorheriger Monat: ${formatYearMonth(prevMonth)}`}
          >
            <ChevronLeft />
          </Link>
          <span className="min-w-36 text-center font-medium">{formatYearMonth(yearMonth)}</span>
          <Link
            href={monthHref(propertyId, nextMonth)}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            aria-label={`Nächster Monat: ${formatYearMonth(nextMonth)}`}
          >
            <ChevronRight />
          </Link>
          {yearMonth !== currentYearMonth() ? (
            <Link
              href={monthHref(propertyId, currentYearMonth())}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Aktueller Monat
            </Link>
          ) : null}
        </nav>
        <RecordTransactionDialog propertyId={propertyId} units={units} />
      </div>

      <Card>
        <CardContent>
          <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            <Stat label="Soll-Miete (warm)" value={formatCentsToEuro(cashflow.sollCents)} />
            <Stat label="Ist-Eingänge" value={formatCentsToEuro(cashflow.istCents)} />
            <Stat
              label="Noch offen (Miete)"
              value={formatCentsToEuro(cashflow.openRentCents)}
            />
            <Stat
              label="Ausgaben (bezahlt)"
              value={formatCentsToEuro(cashflow.expensesPaidCents)}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Soll-Mieten {formatYearMonth(yearMonth)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Einheit</TableHead>
                <TableHead>Mieter</TableHead>
                <TableHead className="text-right">Soll</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashflow.rentLines.length === 0 ? (
                <EmptyRow colSpan={5}>Für diesen Monat gibt es keine Mietverhältnisse.</EmptyRow>
              ) : (
                cashflow.rentLines.map((line) => (
                  <TableRow key={line.unitId}>
                    <TableCell className="font-medium">{line.unitNumber}</TableCell>
                    <TableCell>{line.tenantName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCentsToEuro(line.sollCents)}
                    </TableCell>
                    <TableCell>
                      <RentStatus line={line} isPastMonth={isPastMonth} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {line.status !== "paid" ? (
                          <MarkRentPaidButton
                            unitId={line.unitId}
                            yearMonth={yearMonth}
                            label={`Miete ${line.unitNumber}`}
                          />
                        ) : null}
                        {line.lastPaymentId ? (
                          <UndoPaymentButton
                            transactionId={line.lastPaymentId}
                            label={`Miete ${line.unitNumber}`}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Offene Zahlungen ({cashflow.openPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Art</TableHead>
                <TableHead>Einheit</TableHead>
                <TableHead>Fällig am</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashflow.openPayments.length === 0 ? (
                <EmptyRow colSpan={6}>Keine offenen Posten.</EmptyRow>
              ) : (
                cashflow.openPayments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{TRANSACTION_TYPE_LABELS[item.type]}</TableCell>
                    <TableCell>{item.unitNumber ?? "–"}</TableCell>
                    <TableCell>{formatDate(item.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCentsToEuro(item.amountCents)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatus item={item} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <MarkTransactionPaidButton
                          transactionId={item.id}
                          label={paymentLabel(item)}
                        />
                        <DeleteTransactionButton
                          transactionId={item.id}
                          label={paymentLabel(item)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ausgaben {formatYearMonth(yearMonth)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Art</TableHead>
                <TableHead>Einheit</TableHead>
                <TableHead>Fällig am</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashflow.expenses.length === 0 ? (
                <EmptyRow colSpan={6}>Keine Ausgaben in diesem Monat.</EmptyRow>
              ) : (
                cashflow.expenses.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{TRANSACTION_TYPE_LABELS[item.type]}</TableCell>
                    <TableCell>{item.unitNumber ?? "–"}</TableCell>
                    <TableCell>{formatDate(item.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCentsToEuro(item.amountCents)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatus item={item} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <DeleteTransactionButton
                          transactionId={item.id}
                          label={paymentLabel(item)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
