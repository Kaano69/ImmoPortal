"use client";

import { Hammer, Info, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { NumberField } from "@/components/number-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCentsToEuro, formatDate, formatPercent } from "@/lib/formatters";
import { parseNumberInput } from "@/lib/numbers";
import { cn } from "@/lib/utils";

import { calculateRenovation, type RenovationInput, type RenovationResult } from "../calc";
import type { RenovationPreset } from "../queries";

type Mode = "existing" | "new";

type Position = { id: number; name: string; amount: string; custom: boolean };

const STANDARD_TRADES = [
  "Bad / Sanitär",
  "Böden / Fliesen",
  "Malerarbeiten",
  "Fenster / Türen",
  "Elektrik",
  "Heizung",
  "Fassade / Dach",
];

type ObjectValues = {
  acquisitionCost: string;
  purchaseDate: string;
  areaSqm: string;
  currentRent: string;
};

const EMPTY_OBJECT: ObjectValues = { acquisitionCost: "", purchaseDate: "", areaSqm: "", currentRent: "" };

const formatEuro = (euro: number): string => formatCentsToEuro(Math.round(euro * 100));

function toInput(value: number): string {
  return String(Number(value.toFixed(4))).replace(".", ",");
}

function presetToObject(preset: RenovationPreset): ObjectValues {
  return {
    acquisitionCost: preset.acquisitionCostCents === null ? "" : toInput(preset.acquisitionCostCents / 100),
    purchaseDate: preset.purchaseDate ?? "",
    areaSqm: preset.areaSqm === null ? "" : toInput(preset.areaSqm),
    currentRent: preset.currentColdRentCents > 0 ? toInput(preset.currentColdRentCents / 100) : "",
  };
}

/** Eingabe → Zahl; leer = 0, ungültig oder negativ = `null`. */
function amount(raw: string): number | null {
  const parsed = parseNumberInput(raw);
  if (parsed === undefined) return 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function SliderField({
  id,
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
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
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}

function TaxCheck({ result, completionDate }: { result: RenovationResult; completionDate: string }) {
  const usage = result.usagePercent ?? 0;
  const view = {
    ok: {
      tone: "success" as const,
      icon: ShieldCheck,
      title: "Unter der 15-%-Grenze",
      text: "Die Kosten gelten voraussichtlich als sofort abziehbarer Erhaltungsaufwand (Werbungskosten).",
    },
    exceeded: {
      tone: "destructive" as const,
      icon: ShieldAlert,
      title: "15-%-Grenze überschritten",
      text: "Anschaffungsnahe Herstellungskosten: Die Aufwendungen müssen aktiviert und über die AfA verteilt werden, statt sofort abziehbar zu sein.",
    },
    not_applicable: {
      tone: "success" as const,
      icon: ShieldCheck,
      title: "Außerhalb der 3-Jahres-Frist",
      text: "Die Maßnahmen enden nach Fristablauf – die 15-%-Regel greift nicht. Reiner Erhaltungsaufwand ist sofort abziehbar.",
    },
    no_basis: {
      tone: "warning" as const,
      icon: Info,
      title: "Anschaffungskosten fehlen",
      text: "Ohne Gebäudeanschaffungskosten lässt sich die Grenze nicht berechnen.",
    },
  }[result.taxStatus];
  const Icon = view.icon;
  const exceeded = result.taxStatus === "exceeded";

  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border p-4",
        exceeded && "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
        result.taxStatus === "ok" && "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
      )}
    >
      <Badge variant={view.tone} className="h-auto w-fit whitespace-normal py-1 text-left">
        <Icon aria-hidden />
        {view.title}
      </Badge>
      <p className="text-sm">{view.text}</p>

      {result.taxStatus === "ok" || result.taxStatus === "exceeded" ? (
        <>
          <div
            role="progressbar"
            aria-label="Auslastung der 15-%-Grenze"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(usage))}
            className="h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn("h-full rounded-full", exceeded ? "bg-red-500" : usage > 80 ? "bg-amber-500" : "bg-emerald-500")}
              style={{ width: `${Math.min(100, usage)}%` }}
            />
          </div>
          <dl className="grid gap-1.5">
            <Row label="Gebäudeanschaffungskosten" value={formatEuro(result.buildingCost)} />
            <Row label="15-%-Grenze (netto)" value={formatEuro(result.limit15)} strong />
            <Row label="Angerechnete Kosten (netto)" value={`${formatEuro(result.relevantNet)} (${formatPercent(usage)})`} />
            <Row
              label={result.headroom >= 0 ? "Spielraum bis zur Grenze" : "Überschreitung"}
              value={formatEuro(Math.abs(result.headroom))}
              strong
            />
          </dl>
        </>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {result.fristEnd === null ? (
          <>Kaufdatum fehlt: Die Regel wird vorsichtshalber als anwendbar behandelt. Trage das Kaufdatum ein, um die Frist zu prüfen.</>
        ) : (
          <>
            Frist (3 Jahre nach dem Kauf) endet am {formatDate(result.fristEnd)}.{" "}
            {result.withinFristToday
              ? `Seit dem Kauf sind erst ${toInput(Math.round((result.yearsSincePurchase ?? 0) * 10) / 10)} Jahre vergangen.`
              : "Heute liegt die Frist bereits zurück."}{" "}
            {completionDate > result.fristEnd
              ? "Der geplante Abschluss liegt nach der Frist."
              : exceeded
                ? "Tipp: Maßnahmen, die erst nach Fristende abgeschlossen werden, zählen nicht mit."
                : ""}
          </>
        )}
      </p>
    </div>
  );
}

export function RenovationCalculator({
  presets,
  today,
}: {
  presets: RenovationPreset[];
  today: string;
}) {
  const nextId = useRef(STANDARD_TRADES.length);
  const [mode, setMode] = useState<Mode>("existing");
  const [presetId, setPresetId] = useState("");
  const [object, setObject] = useState<ObjectValues>(EMPTY_OBJECT);
  const [positions, setPositions] = useState<Position[]>(
    STANDARD_TRADES.map((name, id) => ({ id, name, amount: "", custom: false })),
  );
  const [buildingShare, setBuildingShare] = useState(75);
  const [alreadySpent, setAlreadySpent] = useState("");
  const [completionDate, setCompletionDate] = useState(today);
  const [vatPercent, setVatPercent] = useState("19");
  const [vatDeductible, setVatDeductible] = useState(false);
  const [rentIncrease, setRentIncrease] = useState(1);
  const [modernizationShare, setModernizationShare] = useState(50);

  const preset = presets.find((candidate) => candidate.id === presetId) ?? null;
  const setField = (key: keyof ObjectValues, value: string) =>
    setObject((current) => ({ ...current, [key]: value }));

  function changeMode(next: Mode) {
    setMode(next);
    setObject(next === "existing" && preset ? presetToObject(preset) : EMPTY_OBJECT);
  }

  function choosePreset(id: string) {
    setPresetId(id);
    const chosen = presets.find((candidate) => candidate.id === id);
    setObject(chosen ? presetToObject(chosen) : EMPTY_OBJECT);
  }

  const updatePosition = (id: number, patch: Partial<Position>) =>
    setPositions((current) => current.map((position) => (position.id === id ? { ...position, ...patch } : position)));

  const parsed = useMemo(() => {
    const netCosts = positions.map((position) => amount(position.amount));
    const acquisitionCost = amount(object.acquisitionCost);
    const areaSqm = amount(object.areaSqm);
    const currentRent = amount(object.currentRent);
    const spent = amount(alreadySpent);
    const vat = amount(vatPercent);
    const purchaseDate = object.purchaseDate === "" ? null : ISO_DATE.test(object.purchaseDate) ? object.purchaseDate : undefined;
    const completion = ISO_DATE.test(completionDate) ? completionDate : undefined;

    if (
      netCosts.includes(null) ||
      acquisitionCost === null ||
      areaSqm === null ||
      currentRent === null ||
      spent === null ||
      vat === null ||
      vat > 100 ||
      purchaseDate === undefined ||
      completion === undefined
    ) {
      return null;
    }

    const input: RenovationInput = {
      netCosts: netCosts.reduce<number>((sum, value) => sum + (value ?? 0), 0),
      alreadySpentNet: spent,
      vatPercent: vat,
      vatDeductible,
      acquisitionCost,
      buildingSharePercent: buildingShare,
      purchaseDate,
      completionDate: completion,
      today,
      areaSqm,
      currentColdRentMonthly: currentRent,
      rentIncreasePerSqm: rentIncrease,
      modernizationSharePercent: modernizationShare,
    };
    return input;
  }, [
    positions,
    object,
    alreadySpent,
    vatPercent,
    vatDeductible,
    buildingShare,
    completionDate,
    today,
    rentIncrease,
    modernizationShare,
  ]);

  const result = useMemo(() => (parsed ? calculateRenovation(parsed) : null), [parsed]);
  const missing =
    mode === "existing" && preset
      ? [
          preset.acquisitionCostCents === null ? "Anschaffungskosten" : null,
          preset.purchaseDate === null ? "Kaufdatum" : null,
          preset.areaSqm === null ? "Fläche" : null,
        ].filter((entry): entry is string => entry !== null)
      : [];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="grid gap-6">
        <Card>
          <CardHeader className="gap-3">
            <Tabs value={mode} onValueChange={(value) => changeMode(value as Mode)}>
              <TabsList>
                <TabsTrigger value="existing">Bestehendes Objekt</TabsTrigger>
                <TabsTrigger value="new">Freie Eingabe</TabsTrigger>
              </TabsList>
            </Tabs>
            <CardTitle>Objekt &amp; Steuer-Basis</CardTitle>
            <CardDescription>
              {mode === "existing"
                ? "Anschaffungskosten und Kaufdatum werden aus dem Objekt übernommen und lassen sich anpassen."
                : "Gib die Eckdaten eines beliebigen Objekts frei ein."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {mode === "existing" ? (
              <div className="grid gap-2">
                <Label htmlFor="reno-preset">Objekt</Label>
                <Select id="reno-preset" value={presetId} onChange={(event) => choosePreset(event.target.value)}>
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
                      Es fehlen hinterlegte Werte ({missing.join(", ")}). Ergänze sie hier oder dauerhaft in
                      den{" "}
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
                id="reno-acquisition"
                label="Anschaffungskosten gesamt"
                unit="€"
                value={object.acquisitionCost}
                onChange={(value) => setField("acquisitionCost", value)}
                placeholder="z. B. 505.353,18"
                hint="Kaufpreis + Kaufnebenkosten."
              />
              <div className="grid content-start gap-2">
                <Label htmlFor="reno-purchase-date">Kaufdatum</Label>
                <Input
                  id="reno-purchase-date"
                  type="date"
                  value={object.purchaseDate}
                  onChange={(event) => setField("purchaseDate", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Beginn der 3-Jahres-Frist.</p>
              </div>
              <NumberField
                id="reno-area"
                label="Fläche"
                unit="m²"
                value={object.areaSqm}
                onChange={(value) => setField("areaSqm", value)}
              />
              <NumberField
                id="reno-rent"
                label="Aktuelle Kaltmiete"
                unit="€ / Monat"
                value={object.currentRent}
                onChange={(value) => setField("currentRent", value)}
              />
            </div>

            <SliderField
              id="reno-building-share"
              label="Gebäudeanteil an den Anschaffungskosten"
              valueLabel={formatPercent(buildingShare)}
              min={50}
              max={95}
              step={1}
              value={buildingShare}
              onChange={setBuildingShare}
              hint="Ohne Grund und Boden; üblich sind 70–80 %. Maßgeblich ist die Aufteilung im Kaufvertrag oder im Bescheid."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                <Label htmlFor="reno-completion">Geplanter Abschluss der Maßnahmen</Label>
                <Input
                  id="reno-completion"
                  type="date"
                  value={completionDate}
                  onChange={(event) => setCompletionDate(event.target.value)}
                />
              </div>
              <NumberField
                id="reno-spent"
                label="Bereits angefallene Kosten seit Kauf"
                unit="€ netto"
                value={alreadySpent}
                onChange={setAlreadySpent}
                hint="Zählen zur 15-%-Grenze mit."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gewerke</CardTitle>
            <CardDescription>Nettobeträge je Gewerk eintragen; leere Positionen zählen nicht.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ul className="grid gap-3">
              {positions.map((position) => (
                <li key={position.id} className="grid grid-cols-[minmax(0,1fr)_9rem_auto] items-center gap-3">
                  {position.custom ? (
                    <Input
                      aria-label="Bezeichnung der Position"
                      value={position.name}
                      placeholder="Eigene Position"
                      onChange={(event) => updatePosition(position.id, { name: event.target.value })}
                    />
                  ) : (
                    <Label htmlFor={`reno-pos-${position.id}`} className="font-normal">
                      {position.name}
                    </Label>
                  )}
                  <div className="relative">
                    <Input
                      id={`reno-pos-${position.id}`}
                      aria-label={`${position.name || "Position"} netto`}
                      inputMode="decimal"
                      value={position.amount}
                      placeholder="0"
                      className="pr-12 text-right"
                      aria-invalid={amount(position.amount) === null ? true : undefined}
                      onChange={(event) => updatePosition(position.id, { amount: event.target.value })}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      €
                    </span>
                  </div>
                  {position.custom ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${position.name || "Position"} entfernen`}
                      onClick={() => setPositions((current) => current.filter((entry) => entry.id !== position.id))}
                    >
                      <Trash2 />
                    </Button>
                  ) : (
                    <span className="size-9" aria-hidden />
                  )}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => {
                const id = nextId.current++;
                setPositions((current) => [...current, { id, name: "", amount: "", custom: true }]);
              }}
            >
              <Plus />
              Position hinzufügen
            </Button>

            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                <Label htmlFor="reno-vat">Umsatzsteuer</Label>
                <Select id="reno-vat" value={vatPercent} onChange={(event) => setVatPercent(event.target.value)}>
                  <option value="19">19 %</option>
                  <option value="7">7 %</option>
                  <option value="0">0 % (netto = brutto)</option>
                </Select>
              </div>
              <label className="flex items-start gap-3 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={vatDeductible}
                  onChange={(event) => setVatDeductible(event.target.checked)}
                />
                <span>
                  Vorsteuer abziehbar
                  <span className="block text-xs text-muted-foreground">
                    Nur bei umsatzsteuerpflichtiger Vermietung; dann zählt die Nettobelastung.
                  </span>
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mietpotenzial</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <SliderField
              id="reno-rent-increase"
              label="Erwartete Mietsteigerung durch die Sanierung"
              valueLabel={`${formatEuro(rentIncrease)} / m² · Monat`}
              min={0}
              max={5}
              step={0.1}
              value={rentIncrease}
              onChange={setRentIncrease}
            />
            <SliderField
              id="reno-modernization"
              label="Anteil Modernisierung an den Kosten"
              valueLabel={formatPercent(modernizationShare)}
              min={0}
              max={100}
              step={5}
              value={modernizationShare}
              onChange={setModernizationShare}
              hint="Nur Modernisierung (nicht reine Instandhaltung) ist nach § 559 BGB umlagefähig; gilt für Wohnraum."
            />
          </CardContent>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="size-4" aria-hidden />
            Auswertung
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5" aria-live="polite">
          {!result || !parsed ? (
            <p className="text-sm text-destructive">
              Bitte prüfe die Eingaben: Beträge müssen gültige, nicht negative Zahlen und Datumsangaben
              vollständig sein.
            </p>
          ) : (
            <>
              <div className="grid gap-1">
                <p className="text-sm text-muted-foreground">Gesamtkosten brutto</p>
                <p className="text-3xl font-bold tabular-nums">{formatEuro(result.grossTotal)}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  netto {formatEuro(result.netTotal)} · USt {formatEuro(result.vatAmount)}
                </p>
              </div>

              <TaxCheck result={result} completionDate={parsed.completionDate} />

              <dl className="grid gap-2 border-t pt-4">
                <Row label="Investition (wirtschaftliche Belastung)" value={formatEuro(result.outlay)} strong />
                <Row
                  label="Bruttorendite vorher"
                  value={result.yieldBeforePercent === null ? "–" : formatPercent(result.yieldBeforePercent)}
                />
                <Row
                  label="Bruttorendite nachher"
                  value={result.yieldAfterPercent === null ? "–" : formatPercent(result.yieldAfterPercent)}
                  strong
                />
                <Row label="Mehrmiete (angenommen)" value={`${formatEuro(result.extraRentMonthly)} / Monat`} />
                <Row
                  label="Amortisation über die Mehrmiete"
                  value={result.paybackYears === null ? "–" : `${toInput(Math.round(result.paybackYears * 10) / 10)} Jahre`}
                />
                <Row
                  label="Rendite auf die Sanierung"
                  value={
                    result.returnOnRenovationPercent === null ? "–" : formatPercent(result.returnOnRenovationPercent)
                  }
                />
              </dl>

              <div className="grid gap-1 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Modernisierungsumlage (§ 559 BGB, 8 % p. a.)</p>
                <p className="text-xl font-bold tabular-nums">{formatEuro(result.levyMonthly)} / Monat</p>
                <p className="text-xs text-muted-foreground">
                  {result.levyCapMonthly === null
                    ? "Ohne Fläche ist die Kappungsgrenze nicht berechenbar."
                    : `Kappungsgrenze: ${formatEuro(result.levyCapMonthly)} / Monat (innerhalb von 6 Jahren).`}{" "}
                  Voraussetzungen und Ankündigungsfristen vorab prüfen.
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Plausibilitätsrechnung, keine Steuer- oder Rechtsberatung. Ob eine Maßnahme zum
                Erhaltungs- oder Herstellungsaufwand zählt, entscheidet im Einzelfall das Finanzamt.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
