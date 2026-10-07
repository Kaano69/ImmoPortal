import { Banknote, DoorOpen, FileText, Percent } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCentsToEuro, formatPercent } from "@/lib/formatters";

import type { DashboardData } from "@/features/properties/queries";

import type { KpiItem } from "./kpi-board";

type KpiCardProps = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  hint?: ReactNode;
};

function KpiCard({ title, icon: Icon, children, hint }: KpiCardProps) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent className="grid gap-1">
        <div className="flex items-center gap-2 text-2xl font-bold tabular-nums">
          {children}
        </div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

/** Grün bei 0 %, Gelb bis 10 %, darüber Rot. */
function vacancyBadge(ratePercent: number): {
  variant: "success" | "warning" | "destructive";
  label: string;
} {
  if (ratePercent === 0) return { variant: "success", label: "Kein Leerstand" };
  if (ratePercent <= 10) return { variant: "warning", label: "Leerstand" };
  return { variant: "destructive", label: "Hoher Leerstand" };
}

/** Die einzelnen KPI-Karten des Dashboards; ausblendbar über das Anzeige-Menü. */
export function getKpiItems(data: DashboardData): KpiItem[] {
  const badge = vacancyBadge(data.vacancyRatePercent);

  return [
    {
      id: "target-rent",
      label: "Soll-Kaltmiete / Monat",
      node: (
        <KpiCard
          title="Soll-Kaltmiete / Monat"
          icon={Banknote}
          hint="Aus allen aktiven Mietverträgen"
        >
          {formatCentsToEuro(data.targetColdRentCents)}
        </KpiCard>
      ),
    },
    {
      id: "vacancy",
      label: "Leerstandsquote",
      node: (
        <KpiCard
          title="Leerstandsquote"
          icon={Percent}
          hint={`${data.vacantUnits} von ${data.totalUnits} Einheiten leer`}
        >
          {formatPercent(data.vacancyRatePercent)}
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </KpiCard>
      ),
    },
    {
      id: "units",
      label: "Einheiten-Status",
      node: (
        <KpiCard
          title="Einheiten-Status"
          icon={DoorOpen}
          hint={data.totalUnits === 0 ? "Noch keine Einheiten angelegt" : undefined}
        >
          <span>
            {data.rentedUnits} von {data.totalUnits}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              Einheiten vermietet
            </span>
          </span>
        </KpiCard>
      ),
    },
    {
      id: "documents",
      label: "Archivierte Dokumente",
      node: (
        <KpiCard title="Archivierte Dokumente" icon={FileText}>
          {data.documentCount}
        </KpiCard>
      ),
    },
  ];
}
