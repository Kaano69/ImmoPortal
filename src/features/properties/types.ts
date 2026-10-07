import type { FormState } from "@/lib/form-state";

export const PROPERTY_FIELDS = [
  "name",
  "street",
  "zip",
  "city",
  "totalSqm",
  "marketValue",
  "buildYear",
  "purchaseYear",
  "monthlyLoanPayment",
  "annualCosts",
  "annualMaintenanceReserve",
  "vacancyReserve",
  "purchaseDate",
  "acquisitionCost",
  "loanBalance",
  "loanBalanceDate",
  "loanInterest",
] as const;

export type PropertyField = (typeof PROPERTY_FIELDS)[number];
export type PropertyFormState = FormState<PropertyField>;
