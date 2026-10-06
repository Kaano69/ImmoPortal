import { TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyCashflow } from "@/features/finance/types";
import { formatCentsToEuro, formatPercent, formatYearMonth } from "@/lib/formatters";

function collectionBadge(percent: number, hasSoll: boolean) {
  if (!hasSoll) return { variant: "secondary" as const, label: "Keine Soll-Miete" };
  if (percent >= 100) return { variant: "success" as const, label: "Vollständig eingegangen" };
  if (percent >= 80) return { variant: "warning" as const, label: "Teilweise eingegangen" };
  return { variant: "destructive" as const, label: "Rückstand" };
}

export function CashflowCard({ cashflow }: { cashflow: MonthlyCashflow }) {
  const hasSoll = cashflow.sollCents > 0;
  const percent = hasSoll ? (cashflow.istCents / cashflow.sollCents) * 100 : 0;
  const badge = collectionBadge(percent, hasSoll);

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Cashflow {formatYearMonth(cashflow.yearMonth)}: Ist- vs. Soll-Einnahmen
        </CardTitle>
        <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-bold tabular-nums">
            {formatCentsToEuro(cashflow.istCents)}
          </span>
          <span className="text-muted-foreground">
            von {formatCentsToEuro(cashflow.sollCents)} Soll
          </span>
          <Badge variant={badge.variant}>
            {hasSoll ? `${formatPercent(percent)} · ` : ""}
            {badge.label}
          </Badge>
        </div>
        <div
          role="progressbar"
          aria-label="Eingegangene Mieten"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.round(percent))}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Noch offen: {formatCentsToEuro(cashflow.openRentCents)} Miete
          {" · "}
          {cashflow.openPayments.length} weitere offene Posten
          {" · "}
          Ausgaben (bezahlt): {formatCentsToEuro(cashflow.expensesPaidCents)}
        </p>
      </CardContent>
    </Card>
  );
}
