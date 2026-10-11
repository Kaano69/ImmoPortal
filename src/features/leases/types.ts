import type { FormState } from "@/lib/form-state";

export const LEASE_FIELDS = [
  "tenantId",
  "firstName",
  "lastName",
  "email",
  "phone",
  "startDate",
  "endDate",
  "deposit",
] as const;

export type LeaseField = (typeof LEASE_FIELDS)[number];
export type LeaseFormState = FormState<LeaseField>;

export const END_LEASE_FIELDS = ["endDate"] as const;
export type EndLeaseField = (typeof END_LEASE_FIELDS)[number];
export type EndLeaseFormState = FormState<EndLeaseField>;

export const DEPOSIT_FIELDS = [
  "status",
  "receivedAmount",
  "bankAccount",
  "proofDocumentId",
] as const;
export type DepositField = (typeof DEPOSIT_FIELDS)[number];
export type DepositFormState = FormState<DepositField>;
