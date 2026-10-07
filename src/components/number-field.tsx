"use client";

import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseNumberInput } from "@/lib/numbers";

/** Zahlenfeld mit Einheit rechts; erwartet deutsche Eingaben ("1.250,5"), negative Werte gelten als ungültig. */
export function NumberField({
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
  const parsed = parseNumberInput(value);
  const invalid = parsed !== undefined && (!Number.isFinite(parsed) || parsed < 0);

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
          className="pr-16"
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
