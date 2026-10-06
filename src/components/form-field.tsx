import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { FormState } from "@/lib/form-state";

type BaseProps<F extends string> = {
  name: F;
  label: string;
  state: FormState<F>;
  /** Startwert; nach einem Validierungsfehler gelten die zuletzt abgesendeten Eingaben. */
  defaultValue?: string;
  required?: boolean;
  /** Zeigt „(optional)“ am Label, wenn das Feld nicht erforderlich ist. */
  markOptional?: boolean;
  hint?: ReactNode;
};

function useFieldState<F extends string>({
  name,
  state,
  defaultValue = "",
}: Pick<BaseProps<F>, "name" | "state" | "defaultValue">) {
  const error = state.status === "error" ? state.fieldErrors[name] : undefined;
  const value = state.status === "error" ? state.values[name] : defaultValue;
  return { error, value, errorId: `${name}-error` };
}

function FieldShell({
  name,
  label,
  showOptional,
  hint,
  error,
  errorId,
  children,
}: {
  name: string;
  label: string;
  showOptional: boolean;
  hint?: ReactNode;
  error?: string;
  errorId: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={name}>
        {label}
        {showOptional ? (
          <span className="font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputFieldProps<F extends string> = BaseProps<F> &
  Omit<ComponentProps<typeof Input>, "name" | "defaultValue" | "required">;

export function InputField<F extends string>({
  name,
  label,
  state,
  defaultValue,
  required = false,
  markOptional = true,
  hint,
  ...inputProps
}: InputFieldProps<F>) {
  const { error, value, errorId } = useFieldState({ name, state, defaultValue });
  return (
    <FieldShell
      name={name}
      label={label}
      showOptional={markOptional && !required}
      hint={hint}
      error={error}
      errorId={errorId}
    >
      <Input
        id={name}
        name={name}
        defaultValue={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
    </FieldShell>
  );
}

type SelectFieldProps<F extends string> = BaseProps<F> & {
  options: ReadonlyArray<{ value: string; label: string }>;
};

export function SelectField<F extends string>({
  name,
  label,
  state,
  defaultValue,
  required = false,
  markOptional = true,
  hint,
  options,
}: SelectFieldProps<F>) {
  const { error, value, errorId } = useFieldState({ name, state, defaultValue });
  return (
    <FieldShell
      name={name}
      label={label}
      showOptional={markOptional && !required}
      hint={hint}
      error={error}
      errorId={errorId}
    >
      <Select
        id={name}
        name={name}
        defaultValue={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FieldShell>
  );
}
