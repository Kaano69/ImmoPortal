"use client";

import { Calculator, Info } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCentsToEuro, formatPercent } from "@/lib/formatters";
import { parseNumberInput } from "@/lib/numbers";

import { calculateTargetRent, type TargetRentInput } from "../calc";
import type { TargetRentPreset } from "../queries";

type Mode = "existing" | "new";
type ReserveUnit = "perSqm" | "total";

type FormValues = {
  area: string;
  purchasePrice: string;
  loanPayment: string;
  annualCosts: string;
  reserve: string;
  /** Einheit der Rücklage: pro m² und Jahr oder als Gesamtbetrag pro Jahr. */
  reserveUnit: ReserveUnit;
  additionalIncome: string;
  surplus: string;
  plannedRent: string;
  vacancy: number;
};

const DEFAULT_VALUES: FormValues = {
  area: "",
  purchasePrice: "",
  loanPayment: "",
  annualCosts: "",
  reserve: "",
  reserveUnit: "perSqm",
  additionalIncome: "",
  surplus: "500",
  plannedRent: "",
  vacancy: 3,
};

const SURPLUS_MAX = 3000;

const formatEuro = (euro: number): string => formatCentsToEuro(Math.round(euro * 100));

/** Zahl als deutsche Eingabe, z. B. 1250.5 → "1250,5". */
function toInput(value: number): string {
  return String(Number(value.toFixed(4))).replace(".", ",");
}

function centsToInput(cents: number | null): string {
  return cents === null ? "" : toInput(cents / 100);
}

function presetToValues(preset: TargetRentPreset): FormValues {
  const area = preset.areaSqm;
  // Ohne bekannte Fläche lässt sich die hinterlegte Rücklage nur als Jahresbetrag übernehmen.
  const reserveUnit: ReserveUnit = area !== null && area > 0 ? "perSqm" : "total";
  const reserveYearly = preset.annualMaintenanceReserveCents;
  const reserve =
    reserveYearly === null
      ? ""
      : reserveUnit === "perSqm"
        ? toInput(reserveYearly / 100 / (area ?? 1))
        : toInput(reserveYearly / 100);
  return {
    area: area === null ? "" : toInput(area),
    purchasePrice: centsToInput(preset.purchasePriceCents),
    loanPayment: centsToInput(preset.loanPaymentMonthlyCents),
    annualCosts: centsToInput(preset.annualCostsCents),
    reserve,
    reserveUnit,
    additionalIncome: centsToInput(preset.additionalIncomeCents),
    surplus: DEFAULT_VALUES.surplus,
    plannedRent: preset.currentColdRentCents > 0 ? centsToInput(preset.currentColdRentCents) : "",
    vacancy: preset.vacancyPercent ?? DEFAULT_VALUES.vacancy,
  };
}

/** Fehlende Angaben eines Objekts, die der Rechner sonst als 0 annimmt. */
function missingPresetFields(preset: TargetRentPreset): string[] {
  const missing: string[] = [];
  if (preset.areaSqm === null) missing.push("Fläche");
  if (preset.loanPaymentMonthlyCents === null) missing.push("Darlehensrate");
  if (preset.annualCostsCents === null) missing.push("Kosten");
  if (preset.annualMaintenanceReserveCents === null) missing.push("Instandhaltungsrücklage");
  return missing;
}

type Parsed = { ok: true; input: TargetRentInput } | { ok: false };

/** Leere Angaben zählen als 0; unlesbare oder negative Werte machen die Eingabe ungültig. */
function parseValues(values: FormValues): Parsed {
  const read = (raw: string): number | null | "invalid" => {
    const parsed = parseNumberInput(raw);
    if (parsed === undefined) return null;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : "invalid";
  };

  const fields = {
    area: read(values.area),
    purchasePrice: read(values.purchasePrice),
    loanPayment: read(values.loanPayment),
    annualCosts: read(values.annualCosts),
    reserve: read(values.reserve),
    additionalIncome: read(values.additionalIncome),
    surplus: read(values.surplus),
    plannedRent: read(values.plannedRent),
  };
  if (Object.values(fields).includes("invalid")) return { ok: false };

  const num = (value: number | null | "invalid"): number => (typeof value === "number" ? value : 0);
  const optional = (value: number | null | "invalid"): number | null =>
    typeof value === "number" ? value : null;

  return {
    ok: true,
    input: {
      areaSqm: num(fields.area),
      purchasePrice: optional(fields.purchasePrice),
      loanPaymentMonthly: num(fields.loanPayment),
      annualCosts: num(fields.annualCosts),
      maintenanceReserveYearly:
        values.reserveUnit === "perSqm" ? num(fields.reserve) * num(fields.area) : num(fields.reserve),
      additionalIncomeMonthly: num(fields.additionalIncome),
      desiredSurplusMonthly: num(fields.surplus),
      plannedColdRentMonthly: optional(fields.plannedRent),
      vacancyPercent: values.vacancy,
    },
  };
}

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  placeholder?: string;
}) {
  const invalid = (() => {
    const parsed = parseNumberInput(value);
    return parsed !== undefined && (!Number.isFinite(parsed) || parsed < 0);
  })();

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          aria-invalid={invalid ? true : undefined}
          className="pr-14"
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
      {invalid ? (
        <p className="text-xs text-destructive">Bitte eine gültige, nicht negative Zahl angeben.</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
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

export function TargetRentCalculator({ presets }: { presets: TargetRentPreset[] }) {
  const [mode, setMode] = useState<Mode>("existing");
  const [presetId, setPresetId] = useState("");
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);

  const preset = presets.find((candidate) => candidate.id === presetId) ?? null;
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function changeMode(next: Mode) {
    setMode(next);
    if (next === "new") {
      setValues(DEFAULT_VALUES);
    } else {
      setValues(preset ? presetToValues(preset) : DEFAULT_VALUES);
    }
  }

  function choosePreset(id: string) {
    setPresetId(id);
    const chosen = presets.find((candidate) => candidate.id === id);
    setValues(chosen ? presetToValues(chosen) : DEFAULT_VALUES);
  }

  const parsed = useMemo(() => parseValues(values), [values]);
  const result = useMemo(
    () => (parsed.ok ? calculateTargetRent(parsed.input) : null),
    [parsed],
  );

  const surplusNumber = (() => {
    const value = parseNumberInput(values.surplus);
    return value !== undefined && Number.isFinite(value) ? Math.min(Math.max(value, 0), SURPLUS_MAX) : 0;
  })();

  const missing = mode === "existing" && preset ? missingPresetFields(preset) : [];
  const cashflowMonthly = result
    ? (result.plannedCashflowMonthly ?? (parsed.ok ? parsed.input.desiredSurplusMonthly : 0))
    : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <CardHeader className="gap-3">
          <Tabs value={mode} onValueChange={(value) => changeMode(value as Mode)}>
            <TabsList>
              <TabsTrigger value="existing">Bestehendes Objekt</TabsTrigger>
              <TabsTrigger value="new">Neuankauf</TabsTrigger>
            </TabsList>
          </Tabs>
          <CardTitle>Eingaben</CardTitle>
          <CardDescription>
            {mode === "existing"
              ? "Wähle ein Objekt – die hinterlegten Werte werden übernommen und lassen sich für Szenarien anpassen."
              : "Gib die Eckdaten eines geplanten Kaufs frei ein."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {mode === "existing" ? (
            <div className="grid gap-2">
              <Label htmlFor="preset">Objekt</Label>
              <Select id="preset" value={presetId} onChange={(event) => choosePreset(event.target.value)}>
                <option value="">Objekt wählen …</option>
                {presets.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </Select>
              {preset && missing.length > 0 ? (
                <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>
                    Für dieses Objekt fehlen hinterlegte Werte ({missing.join(", ")}). Trage sie hier
                    ein oder pflege sie dauerhaft in den{" "}
                    <Link href={`/properties/${preset.id}`} className="underline">
                      Stammdaten
                    </Link>
                    .
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="area"
              label="Fläche"
              unit="m²"
              value={values.area}
              onChange={(value) => set("area", value)}
              placeholder="z. B. 341"
            />
            <NumberField
              id="purchasePrice"
              label={mode === "existing" ? "Kaufpreis / Marktwert" : "Geplanter Kaufpreis"}
              unit="€"
              value={values.purchasePrice}
              onChange={(value) => set("purchasePrice", value)}
              placeholder="z. B. 460.000"
              hint="Nur für die Bruttorendite."
            />
            <NumberField
              id="loanPayment"
              label="Darlehensrate"
              unit="€ / Monat"
              value={values.loanPayment}
              onChange={(value) => set("loanPayment", value)}
              placeholder="z. B. 2.265"
            />
            <NumberField
              id="annualCosts"
              label="Nicht umlegbare Kosten"
              unit="€ / Jahr"
              value={values.annualCosts}
              onChange={(value) => set("annualCosts", value)}
              placeholder="z. B. 8.500"
              hint="Inkl. abzuführender Umsatzsteuer."
            />
            <div className="grid content-start gap-2">
              <NumberField
                id="reserve"
                label="Instandhaltungsrücklage"
                unit={values.reserveUnit === "perSqm" ? "€/m² · Jahr" : "€ / Jahr"}
                value={values.reserve}
                onChange={(value) => set("reserve", value)}
                placeholder={values.reserveUnit === "perSqm" ? "z. B. 12" : "z. B. 4.092"}
              />
              <Select
                aria-label="Einheit der Instandhaltungsrücklage"
                value={values.reserveUnit}
                onChange={(event) => set("reserveUnit", event.target.value as ReserveUnit)}
                className="h-8 text-xs"
              >
                <option value="perSqm">Angabe in € pro m² und Jahr</option>
                <option value="total">Angabe als Gesamtbetrag pro Jahr</option>
              </Select>
            </div>
            <NumberField
              id="additionalIncome"
              label="Einnahmen aus NK / USt"
              unit="€ / Monat"
              value={values.additionalIncome}
              onChange={(value) => set("additionalIncome", value)}
              placeholder="z. B. 967,20"
              hint="Vorauszahlungen der Mieter, die Kosten decken."
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="surplus">Gewünschter Überschuss</Label>
              <div className="relative w-36">
                <Input
                  id="surplus"
                  inputMode="decimal"
                  value={values.surplus}
                  className="pr-20 text-right"
                  onChange={(event) => set("surplus", event.target.value)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  € / Monat
                </span>
              </div>
            </div>
            <Slider
              aria-label="Gewünschter Überschuss pro Monat"
              min={0}
              max={SURPLUS_MAX}
              step={50}
              value={[surplusNumber]}
              onValueChange={([value]) => set("surplus", String(value))}
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="vacancy">Kalkulierter Leerstand</Label>
              <span className="text-sm font-medium tabular-nums">{formatPercent(values.vacancy)}</span>
            </div>
            <Slider
              id="vacancy"
              aria-label="Kalkulierter Leerstand in Prozent"
              min={0}
              max={30}
              step={0.5}
              value={[values.vacancy]}
              onValueChange={([value]) => set("vacancy", value)}
            />
          </div>

          <NumberField
            id="plannedRent"
            label={mode === "existing" ? "Aktuelle / geplante Kaltmiete" : "Geplante Kaltmiete (optional)"}
            unit="€ / Monat"
            value={values.plannedRent}
            onChange={(value) => set("plannedRent", value)}
            placeholder="z. B. 3.200"
            hint="Damit berechnet der Rechner den Cashflow und den Abstand zur erforderlichen Miete."
          />
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="size-4" aria-hidden />
            Ergebnis
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5" aria-live="polite">
          {!result || !parsed.ok ? (
            <p className="text-sm text-destructive">
              Bitte prüfe die Eingaben: Alle Werte müssen gültige, nicht negative Zahlen sein.
            </p>
          ) : (
            <>
              <div className="grid gap-1">
                <p className="text-sm text-muted-foreground">Erforderliche Kaltmiete / Monat</p>
                <p className="text-3xl font-bold tabular-nums">
                  {formatEuro(result.requiredColdRentMonthly)}
                </p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {result.requiredColdRentPerSqm === null
                    ? "€/m² nicht berechenbar – Fläche fehlt"
                    : `${formatEuro(result.requiredColdRentPerSqm)} pro m²`}
                </p>
              </div>

              <div className="grid gap-1 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Netto-Cashflow / Monat nach Rücklagen
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-2xl font-bold tabular-nums">
                    {formatEuro(cashflowMonthly ?? 0)}
                  </p>
                  <Badge variant={(cashflowMonthly ?? 0) >= 0 ? "success" : "destructive"}>
                    {(cashflowMonthly ?? 0) >= 0 ? "Überschuss" : "Zuschuss nötig"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {result.plannedCashflowMonthly === null
                    ? "Bei der erforderlichen Kaltmiete (entspricht dem gewünschten Überschuss)."
                    : `Bei einer Kaltmiete von ${formatEuro(parsed.input.plannedColdRentMonthly ?? 0)} pro Monat.`}
                </p>
              </div>

              {result.rentSurplusMonthly !== null ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {result.rentSurplusMonthly >= 0
                      ? "Puffer zur erforderlichen Miete"
                      : "Mietlücke zur erforderlichen Miete"}
                  </span>
                  <Badge variant={result.rentSurplusMonthly >= 0 ? "success" : "destructive"}>
                    {result.rentSurplusMonthly >= 0 ? "+" : "−"}
                    {formatEuro(Math.abs(result.rentSurplusMonthly))} / Monat
                  </Badge>
                </div>
              ) : null}

              <dl className="grid gap-2 border-t pt-4">
                <ResultRow label="Jahreskaltmiete (erforderlich)" value={formatEuro(result.requiredColdRentYearly)} strong />
                {result.grossYieldPercent !== null ? (
                  <ResultRow label="Bruttorendite (erforderlich)" value={formatPercent(result.grossYieldPercent)} strong />
                ) : null}
                <ResultRow label="Darlehen p. a." value={formatEuro(result.loanYearly)} />
                <ResultRow label="Nicht umlegbare Kosten p. a." value={formatEuro(parsed.input.annualCosts)} />
                <ResultRow label="Instandhaltungsrücklage p. a." value={formatEuro(result.maintenanceReserveYearly)} />
                <ResultRow label="Gewünschter Überschuss p. a." value={formatEuro(parsed.input.desiredSurplusMonthly * 12)} />
                <ResultRow label="− NK/USt-Einnahmen p. a." value={formatEuro(parsed.input.additionalIncomeMonthly * 12)} />
                <ResultRow label="Leerstandsabschlag" value={formatPercent(parsed.input.vacancyPercent)} />
              </dl>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
