"use client";

import { Info, Landmark, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { NumberField } from "@/components/number-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addYears, diffYears } from "@/lib/dates";
import { formatCentsToEuro, formatDate, formatPercent } from "@/lib/formatters";
import { parseNumberInput } from "@/lib/numbers";

import { calculateSale, type SaleInput, type TaxStatus } from "../calc";
import type { SalePreset } from "../queries";

type Mode = "existing" | "new";

type FormValues = {
  marketValue: string;
  acquisitionCost: string;
  otherCosts: string;
  depreciation: string;
  taxRate: string;
  purchaseDate: string;
  loanBalance: string;
  loanBalanceDate: string;
  loanInterest: string;
  monthlyPayment: string;
  selfUse: boolean;
  selfUseSince: string;
  selfUseContinuous: boolean;
  years: number;
  appreciation: number;
  saleCost: number;
};

const DEFAULT_VALUES: FormValues = {
  marketValue: "",
  acquisitionCost: "",
  otherCosts: "",
  depreciation: "",
  taxRate: "42",
  purchaseDate: "",
  loanBalance: "",
  loanBalanceDate: "",
  loanInterest: "",
  monthlyPayment: "",
  selfUse: false,
  selfUseSince: "",
  selfUseContinuous: true,
  years: 10,
  appreciation: 2,
  saleCost: 3,
};

const YEARS_MAX = 25;

const formatEuro = (euro: number): string => formatCentsToEuro(Math.round(euro * 100));

function toInput(value: number): string {
  return String(Number(value.toFixed(4))).replace(".", ",");
}

function centsToInput(cents: number | null): string {
  return cents === null ? "" : toInput(cents / 100);
}

/** Haltedauer, bei der der Verkauf knapp nach der 10-Jahres-Frist liegt (sonst 10 Jahre). */
function defaultYears(purchaseDate: string | null, today: string): number {
  if (!purchaseDate) return DEFAULT_VALUES.years;
  const untilFrist = diffYears(today, addYears(purchaseDate, 10)) + 0.1;
  return Math.min(YEARS_MAX, Math.max(0, Math.round(untilFrist * 10) / 10));
}

function presetToValues(preset: SalePreset, today: string): FormValues {
  return {
    ...DEFAULT_VALUES,
    marketValue: centsToInput(preset.marketValueCents),
    acquisitionCost: centsToInput(preset.acquisitionCostCents),
    purchaseDate: preset.purchaseDate ?? "",
    loanBalance: centsToInput(preset.loanBalanceCents),
    loanBalanceDate: preset.loanBalanceDate ?? "",
    loanInterest: preset.loanInterestPercent === null ? "" : toInput(preset.loanInterestPercent),
    monthlyPayment: centsToInput(preset.monthlyPaymentCents),
    years: defaultYears(preset.purchaseDate, today),
  };
}

function missingFields(preset: SalePreset): string[] {
  const missing: string[] = [];
  if (preset.marketValueCents === null) missing.push("Marktwert");
  if (preset.purchaseDate === null) missing.push("Kaufdatum");
  if (preset.acquisitionCostCents === null) missing.push("Anschaffungskosten");
  if (preset.loanBalanceCents === null) missing.push("Restschuld");
  return missing;
}

type Parsed = { ok: true; input: SaleInput } | { ok: false };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseValues(values: FormValues, today: string): Parsed {
  const read = (raw: string): number | "invalid" => {
    const parsed = parseNumberInput(raw);
    if (parsed === undefined) return 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : "invalid";
  };
  const date = (raw: string): string | null | "invalid" => {
    if (raw === "") return null;
    return ISO_DATE.test(raw) ? raw : "invalid";
  };

  const marketValue = read(values.marketValue);
  const acquisitionCost = read(values.acquisitionCost);
  const otherCosts = read(values.otherCosts);
  const depreciation = read(values.depreciation);
  const taxRate = read(values.taxRate);
  const loanBalance = read(values.loanBalance);
  const loanInterest = read(values.loanInterest);
  const monthlyPayment = read(values.monthlyPayment);
  const purchaseDate = date(values.purchaseDate);
  const loanBalanceDate = date(values.loanBalanceDate);
  const selfUseSince = date(values.selfUseSince);

  if (
    [marketValue, acquisitionCost, otherCosts, depreciation, taxRate, loanBalance, loanInterest, monthlyPayment, purchaseDate, loanBalanceDate, selfUseSince].includes("invalid") ||
    typeof taxRate !== "number" ||
    taxRate > 100
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    input: {
      marketValue: marketValue as number,
      appreciationPercent: values.appreciation,
      yearsFromToday: values.years,
      saleCostPercent: values.saleCost,
      adjustedAcquisitionCost: acquisitionCost as number,
      otherCosts: otherCosts as number,
      accumulatedDepreciation: depreciation as number,
      taxRatePercent: taxRate,
      loanBalance: loanBalance as number,
      loanBalanceDate: loanBalanceDate as string | null,
      loanInterestPercent: loanInterest as number,
      monthlyPayment: monthlyPayment as number,
      purchaseDate: purchaseDate as string | null,
      today,
      selfUse: {
        enabled: values.selfUse,
        since: selfUseSince as string | null,
        continuous: values.selfUseContinuous,
      },
    },
  };
}

const TAX_STATUS: Record<
  TaxStatus,
  { variant: "success" | "warning" | "destructive"; label: string; icon: typeof ShieldCheck }
> = {
  free_10_years: { variant: "success", label: "Steuerfrei (10-Jahres-Frist abgelaufen)", icon: ShieldCheck },
  free_self_use: { variant: "success", label: "Steuerfrei (Eigennutzung)", icon: ShieldCheck },
  taxable: { variant: "destructive", label: "Steuerpflichtig (Spekulationsfrist läuft)", icon: TriangleAlert },
  unknown: { variant: "warning", label: "Kaufdatum fehlt – vorsichtig steuerpflichtig gerechnet", icon: TriangleAlert },
};

function SliderField({
  id,
  label,
  valueLabel,
  ...slider
}: {
  id: string;
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-sm font-medium tabular-nums">{valueLabel}</span>
      </div>
      <Slider
        id={id}
        aria-label={label}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={[slider.value]}
        onValueChange={([value]) => slider.onChange(value)}
      />
    </div>
  );
}

function DateField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ResultRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}

export function SaleCalculator({ presets, today }: { presets: SalePreset[]; today: string }) {
  const [mode, setMode] = useState<Mode>("existing");
  const [presetId, setPresetId] = useState("");
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);

  const preset = presets.find((candidate) => candidate.id === presetId) ?? null;
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function changeMode(next: Mode) {
    setMode(next);
    setValues(next === "existing" && preset ? presetToValues(preset, today) : DEFAULT_VALUES);
  }

  function choosePreset(id: string) {
    setPresetId(id);
    const chosen = presets.find((candidate) => candidate.id === id);
    setValues(chosen ? presetToValues(chosen, today) : DEFAULT_VALUES);
  }

  const parsed = useMemo(() => parseValues(values, today), [values, today]);
  const result = useMemo(() => (parsed.ok ? calculateSale(parsed.input) : null), [parsed]);

  const missing = mode === "existing" && preset ? missingFields(preset) : [];
  const yearOnly =
    mode === "existing" && preset && preset.purchaseDate === null && preset.purchaseYear !== null
      ? preset.purchaseYear
      : null;

  const status = result ? TAX_STATUS[result.taxStatus] : null;
  const StatusIcon = status?.icon;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <CardHeader className="gap-3">
          <Tabs value={mode} onValueChange={(value) => changeMode(value as Mode)}>
            <TabsList>
              <TabsTrigger value="existing">Bestehendes Objekt</TabsTrigger>
              <TabsTrigger value="new">Freie Simulation</TabsTrigger>
            </TabsList>
          </Tabs>
          <CardTitle>Eingaben</CardTitle>
          <CardDescription>
            {mode === "existing"
              ? "Wähle ein Objekt – Marktwert, Kaufdatum und Restschuld werden übernommen und lassen sich für Szenarien anpassen."
              : "Simuliere den Verkauf eines beliebigen Objekts mit eigenen Annahmen."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {mode === "existing" ? (
            <div className="grid gap-2">
              <Label htmlFor="sale-preset">Objekt</Label>
              <Select id="sale-preset" value={presetId} onChange={(event) => choosePreset(event.target.value)}>
                <option value="">Objekt wählen …</option>
                {presets.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </Select>
              {preset && (missing.length > 0 || yearOnly !== null) ? (
                <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>
                    {missing.length > 0 ? <>Es fehlen hinterlegte Werte ({missing.join(", ")}). </> : null}
                    {yearOnly !== null ? (
                      <>Nur das Kaufjahr {yearOnly} ist bekannt – bitte das genaue Kaufdatum eintragen. </>
                    ) : null}
                    Ergänze sie hier oder dauerhaft in den{" "}
                    <Link href={`/properties/${preset.id}`} className="underline">
                      Stammdaten
                    </Link>
                    .
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-5">
            <SliderField
              id="sale-years"
              label="Haltedauer ab heute"
              valueLabel={`${toInput(values.years)} Jahre`}
              min={0}
              max={YEARS_MAX}
              step={0.5}
              value={values.years}
              onChange={(value) => set("years", value)}
            />
            <SliderField
              id="sale-appreciation"
              label="Wertsteigerung p. a."
              valueLabel={formatPercent(values.appreciation)}
              min={0}
              max={6}
              step={0.1}
              value={values.appreciation}
              onChange={(value) => set("appreciation", value)}
            />
            <SliderField
              id="sale-cost"
              label="Verkaufskosten (Makler, Notar, Abschlag)"
              valueLabel={formatPercent(values.saleCost)}
              min={0}
              max={8}
              step={0.1}
              value={values.saleCost}
              onChange={(value) => set("saleCost", value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="sale-market-value"
              label="Marktwert heute"
              unit="€"
              value={values.marketValue}
              onChange={(value) => set("marketValue", value)}
              placeholder="z. B. 460.000"
            />
            <NumberField
              id="sale-acquisition"
              label="Bereinigte Anschaffungskosten"
              unit="€"
              value={values.acquisitionCost}
              onChange={(value) => set("acquisitionCost", value)}
              placeholder="z. B. 505.353,18"
              hint="Kaufpreis + Nebenkosten + Renovierung."
            />
            <NumberField
              id="sale-other-costs"
              label="Weitere wertrelevante Kosten"
              unit="€"
              value={values.otherCosts}
              onChange={(value) => set("otherCosts", value)}
            />
            <NumberField
              id="sale-depreciation"
              label="Kumulierte AfA bis Verkauf"
              unit="€"
              value={values.depreciation}
              onChange={(value) => set("depreciation", value)}
              hint="Mindert die steuerliche Kostenbasis."
            />
            <NumberField
              id="sale-tax-rate"
              label="Persönlicher Steuersatz"
              unit="%"
              value={values.taxRate}
              onChange={(value) => set("taxRate", value)}
            />
            <DateField
              id="sale-purchase-date"
              label="Kaufdatum"
              value={values.purchaseDate}
              onChange={(value) => set("purchaseDate", value)}
              hint="Datum des Kaufvertrags, für die 10-Jahres-Frist."
            />
          </div>

          <fieldset className="grid gap-4 rounded-md border p-4">
            <legend className="px-1 text-sm font-medium">Darlehen</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="sale-loan-balance"
                label="Restschuld"
                unit="€"
                value={values.loanBalance}
                onChange={(value) => set("loanBalance", value)}
              />
              <DateField
                id="sale-loan-date"
                label="Stand der Restschuld"
                value={values.loanBalanceDate}
                onChange={(value) => set("loanBalanceDate", value)}
                hint="Ohne Angabe gilt heute."
              />
              <NumberField
                id="sale-loan-interest"
                label="Darlehenszins"
                unit="% p. a."
                value={values.loanInterest}
                onChange={(value) => set("loanInterest", value)}
              />
              <NumberField
                id="sale-loan-payment"
                label="Monatsrate"
                unit="€ / Monat"
                value={values.monthlyPayment}
                onChange={(value) => set("monthlyPayment", value)}
                hint="Ohne Rate bleibt die Restschuld unverändert."
              />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-md border p-4">
            <legend className="px-1 text-sm font-medium">Eigennutzung</legend>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={values.selfUse}
                onChange={(event) => set("selfUse", event.target.checked)}
              />
              <span>
                Eigennutzung (im Jahr des Verkaufs und den beiden vorangegangenen Jahren)
                <span className="block text-xs text-muted-foreground">
                  Relevant z. B. für die Mannheimer Wohnung: Nutzung zu eigenen Wohnzwecken macht den
                  Verkauf auch innerhalb von 10 Jahren steuerfrei.
                </span>
              </span>
            </label>
            {values.selfUse ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  id="sale-self-use-since"
                  label="Eigennutzung ab"
                  value={values.selfUseSince}
                  onChange={(value) => set("selfUseSince", value)}
                />
                <label className="flex items-start gap-3 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-primary"
                    checked={values.selfUseContinuous}
                    onChange={(event) => set("selfUseContinuous", event.target.checked)}
                  />
                  <span>Lückenlos bis zum Verkauf (keine Vermietung oder Leerstand dazwischen)</span>
                </label>
              </div>
            ) : null}
          </fieldset>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="size-4" aria-hidden />
            Ergebnis
          </CardTitle>
          {result ? (
            <CardDescription>
              Verkauf am {formatDate(result.saleDate)}
              {result.holdingYears !== null
                ? ` · ${toInput(Math.round(result.holdingYears * 10) / 10)} Jahre nach dem Kauf`
                : ""}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-5" aria-live="polite">
          {!result || !parsed.ok || !status || !StatusIcon ? (
            <p className="text-sm text-destructive">
              Bitte prüfe die Eingaben: Beträge müssen gültige, nicht negative Zahlen und Datumsangaben
              vollständig sein.
            </p>
          ) : (
            <>
              <div className="grid gap-1">
                <p className="text-sm text-muted-foreground">Netto-Auszahlung (Geldfluss aufs Konto)</p>
                <p className="text-3xl font-bold tabular-nums">{formatEuro(result.netPayout)}</p>
                <p className="text-xs text-muted-foreground">
                  Verkaufswert − Verkaufskosten − Restschuld − Steuer.
                </p>
              </div>

              <div className="grid gap-1 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Wirtschaftlicher Gewinn vor Steuer</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatEuro(result.economicGainBeforeTax)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Nach Steuer: {formatEuro(result.economicGainAfterTax)}. Die Restschuld zählt hier nicht
                  als Kosten – sie mindert die Auszahlung, nicht den Gewinn.
                </p>
              </div>

              <div className="grid gap-2 rounded-lg border p-4">
                <Badge variant={status.variant} className="h-auto w-fit whitespace-normal py-1 text-left">
                  <StatusIcon aria-hidden />
                  {status.label}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {result.tenYearDate !== null ? (
                    <>
                      10-Jahres-Frist (§ 23 EStG) endet am {formatDate(result.tenYearDate)}; steuerfrei
                      verkaufbar ab {formatDate(result.earliestTaxFreeSaleDate ?? result.tenYearDate)}.
                    </>
                  ) : (
                    <>Ohne Kaufdatum lässt sich die 10-Jahres-Frist nicht prüfen.</>
                  )}
                  {values.selfUse && result.taxStatus === "taxable" ? (
                    <>
                      {" "}
                      Die Eigennutzung befreit nur, wenn sie lückenlos bis zum Verkauf läuft und spätestens
                      im zweiten Jahr vor dem Verkaufsjahr beginnt.
                    </>
                  ) : null}
                </p>
              </div>

              <dl className="grid gap-2 border-t pt-4">
                <ResultRow label="Verkaufswert" value={formatEuro(result.saleValue)} strong />
                <ResultRow label="− Verkaufskosten" value={formatEuro(result.saleCosts)} />
                <ResultRow label="− Restschuld zum Verkauf" value={formatEuro(result.remainingDebt)} />
                <ResultRow label="− Steuer (modelliert)" value={formatEuro(result.tax)} />
                <ResultRow label="Steuerpflichtiger Gewinn (§ 23)" value={formatEuro(Math.max(0, result.taxableGain))} />
              </dl>

              <p className="text-xs text-muted-foreground">
                Plausibilitätsrechnung, keine Steuer- oder Rechtsberatung. Die Restschuld wird als
                Annuität fortgeschrieben und kann vom Tilgungsplan der Bank leicht abweichen.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
