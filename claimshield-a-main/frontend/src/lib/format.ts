export function inr(value: number | null | undefined): string {
  const v = Number(value || 0);
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: v % 1 ? 2 : 0 });
}

/** Amount or a dash/label when the backend could not determine it. */
export function inrOr(value: number | null | undefined, missing = "Not determined"): string {
  return typeof value === "number" && Number.isFinite(value) ? inr(value) : missing;
}

export function humanize(value: string | null | undefined): string {
  return String(value ?? "").replaceAll("_", " ");
}

export function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

export const FINDING_TYPE_LABEL: Record<string, string> = {
  DUPLICATE_CHARGE: "Duplicate charge",
  ARITHMETIC_ERROR: "Quantity × rate error",
  TOTAL_MISMATCH: "Total doesn't add up",
  QUANTITY_MISMATCH: "Quantity exceeds stay",
  UPCODING_SIGNAL: "Possible upcoding",
  PRICE_OUTLIER: "Above benchmark",
  COVERAGE_MISMATCH: "Settled differently from policy",
  CLINICAL_REVIEW: "Clinical question",
};

export function findingLabel(type: string): string {
  return FINDING_TYPE_LABEL[type] ?? humanize(type);
}

export const CASE_ID_PATTERN = /^[a-z0-9-]{6,64}$/;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
