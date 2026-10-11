"use client";

import { Banknote, PiggyBank, Scale, TrendingUp } from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatCentsToEuro, formatPercent } from "@/lib/formatters";

import { getWealthSnapshot, projectWealth, type WealthProperty } from "../calc";

const HORIZONS = [1, 3, 5, 10] as const;
const DEFAULT_APPRECIATION = 1.5;

function KpiCard({
  title,
  icon: Icon,
  children,
  hint,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent className="grid gap-1">
        <div className="text-2xl font-bold tabular-nums">{children}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function WealthGrowthDashboard({
  properties,
  today,
}: {
  properties: WealthProperty[];
  today: string;
}) {
  const [appreciationPercent, setAppreciationPercent] = useState(DEFAULT_APPRECIATION);

  const snapshot = useMemo(() => getWealthSnapshot(properties, today), [properties, today]);
  const projection = useMemo(
    () =>
      projectWealth(properties, {
        horizonsYears: HORIZONS,
        appreciationPercent,
        today,
      }),
    [properties, today, appreciationPercent],
  );

  const maxValueCents = Math.max(
    snapshot.totalValueCents,
    ...projection.map((point) => point.valueCents),
    1,
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Gesamtwert Portfolio" icon={Banknote}>
          {formatCentsToEuro(snapshot.totalValueCents)}
        </KpiCard>
        <KpiCard
          title="Gesamtverbindlichkeiten heute"
          icon={Scale}
          hint="Restschuld aller Darlehen, auf heute fortgeschrieben"
        >
          {formatCentsToEuro(snapshot.totalDebtCents)}
        </KpiCard>
        <KpiCard
          title="Eigenkapitalquote"
          icon={PiggyBank}
          hint={`Eigenkapital: ${formatCentsToEuro(snapshot.equityCents)}`}
        >
          {formatPercent(snapshot.equityRatioPercent)}
        </KpiCard>
        <KpiCard
          title="Monatlicher Vermögenszuwachs durch Tilgung"
          icon={TrendingUp}
          hint="Tilgungsanteil aller Darlehensraten, Stand heute"
        >
          {formatCentsToEuro(snapshot.monthlyPrincipalCents)}
        </KpiCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Annahmen</CardTitle>
          <CardDescription>
            Wie stark soll der Gebäudewert jährlich steigen? Die Tilgung läuft unabhängig davon über
            den bestehenden Tilgungsplan der Darlehen weiter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="wealth-appreciation">Angenommene Wertsteigerung p. a.</Label>
              <span className="text-sm font-medium tabular-nums">
                {formatPercent(appreciationPercent)}
              </span>
            </div>
            <Slider
              id="wealth-appreciation"
              aria-label="Angenommene Wertsteigerung pro Jahr"
              min={0}
              max={3}
              step={0.1}
              value={[appreciationPercent]}
              onValueChange={([value]) => setAppreciationPercent(value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prognose: Entwicklung des Nettovermögens</CardTitle>
          <CardDescription>
            Eigenkapital = Portfoliowert − Restschuld, fortgeschrieben über die Tilgungspläne der
            Darlehen und die oben gewählte Wertsteigerung.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-3" role="img" aria-label="Vorschau der Eigenkapitalentwicklung als Balkendiagramm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Heute</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                  Eigenkapital
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-muted-foreground/40" aria-hidden />
                  Restschuld
                </span>
              </div>
            </div>
            <BarRow
              label="Heute"
              equityCents={snapshot.equityCents}
              debtCents={snapshot.totalDebtCents}
              maxValueCents={maxValueCents}
            />
            {projection.map((point) => (
              <BarRow
                key={point.years}
                label={`in ${point.years} ${point.years === 1 ? "Jahr" : "Jahren"}`}
                equityCents={point.equityCents}
                debtCents={point.debtCents}
                maxValueCents={maxValueCents}
              />
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 font-medium">Horizont</th>
                  <th className="py-2 text-right font-medium">Portfoliowert</th>
                  <th className="py-2 text-right font-medium">Restschuld</th>
                  <th className="py-2 text-right font-medium">Eigenkapital</th>
                  <th className="py-2 text-right font-medium">Zuwachs ggü. heute</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium">Heute</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatCentsToEuro(snapshot.totalValueCents)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatCentsToEuro(snapshot.totalDebtCents)}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums">
                    {formatCentsToEuro(snapshot.equityCents)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">–</td>
                </tr>
                {projection.map((point) => (
                  <tr key={point.years} className="border-b last:border-0">
                    <td className="py-2 font-medium">
                      {point.years} {point.years === 1 ? "Jahr" : "Jahre"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCentsToEuro(point.valueCents)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCentsToEuro(point.debtCents)}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {formatCentsToEuro(point.equityCents)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      +{formatCentsToEuro(point.equityGrowthCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Plausibilitätsrechnung auf Basis der hinterlegten Marktwerte und Darlehensdaten, keine
            Anlageberatung. Objekte ohne hinterlegten Marktwert oder Darlehensdaten gehen mit 0 € in
            die jeweilige Größe ein.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function BarRow({
  label,
  equityCents,
  debtCents,
  maxValueCents,
}: {
  label: string;
  equityCents: number;
  debtCents: number;
  maxValueCents: number;
}) {
  const totalCents = equityCents + debtCents;
  const equityPercent = (Math.max(0, equityCents) / maxValueCents) * 100;
  const debtPercent = (Math.max(0, debtCents) / maxValueCents) * 100;

  return (
    <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex h-5 w-full overflow-hidden rounded-sm bg-muted">
        <div className="h-full bg-emerald-500" style={{ width: `${equityPercent}%` }} />
        <div className="h-full bg-muted-foreground/40" style={{ width: `${debtPercent}%` }} />
      </div>
      <span className="tabular-nums">{formatCentsToEuro(totalCents)}</span>
    </div>
  );
}
