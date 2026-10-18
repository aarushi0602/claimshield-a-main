/** Shapes returned by GET /api/cases/{id} and /api/samples. Optional fields are those the
 * backend omits for some flows (e.g. claim_review only exists for uploaded claims). */

export interface Stack {
  [service: string]: string;
}

export interface SampleBill {
  id: string;
  file: string;
  url: string;
  policy: string;
  policy_plan: string;
  hospital: string;
  procedure: string;
  patient: string;
  gross: number;
  insurer_approved: number;
  patient_payable: number;
  clean: boolean;
}

export interface SamplePolicy {
  id: string;
  file: string;
  url: string;
  plan: string;
  insurer: string;
}

export interface SampleCatalog {
  bills: Record<string, SampleBill>;
  policies: Record<string, SamplePolicy>;
}

export interface LineItem {
  line_no: number;
  service_date: string;
  code: string;
  description: string;
  dept: string;
  category: string;
  qty: number;
  unit_price: number;
  amount: number;
}

export interface Deduction {
  label: string;
  basis: string;
  amount: number;
}

export interface Bill {
  bill_number: string;
  hospital: string;
  hospital_address?: string;
  network_hospital: boolean;
  patient_name: string;
  patient_age: number | null;
  policy_number: string;
  insurer_tpa?: string;
  admission_date: string;
  discharge_date: string;
  diagnosis: string;
  procedure: string;
  line_items: LineItem[];
  stated_gross_total: number;
  deductions: Deduction[];
  insurer_approved: number;
  patient_payable: number;
}

export interface PolicyCitation {
  clause_id: string;
  title: string;
  quote: string;
  source: string;
  page: number;
}

export interface EvidenceLine {
  line_no: number;
  document_id?: string;
  page?: number | null;
  source_text?: string | null;
  description?: string;
  amount?: number;
}

export interface CalculationStep {
  label: string;
  inputs: unknown;
  result: number;
}

export interface FindingEvidence {
  status: "verified" | "partial" | "insufficient";
  bill_lines?: EvidenceLine[];
  policy?: { status: string; clause_id?: string; title?: string; page?: number; text?: string; reason?: string };
  calculation?: { status: string; steps?: CalculationStep[]; total?: number };
  confidence?: string;
}

export interface Finding {
  finding_id: string;
  type: string;
  title: string;
  bill_lines: number[];
  bill_evidence: string;
  policy: PolicyCitation | null;
  explanation: string;
  confidence: "High" | "Worth reviewing";
  impact: number;
  counterparty: "hospital" | "insurer";
  detected_by: string;
  method: string;
  topic?: string;
  evidence?: FindingEvidence;
}

export interface Entitlement {
  gross: number;
  non_payable: number;
  room_excess: number;
  admissible: number;
  sub_limit_applied: number | null;
  after_sub_limit: number;
  copay_pct: number;
  copay: number;
  insurer_payable: number;
  patient_payable: number;
}

export interface Reconciliation {
  billed_gross: number;
  insurer_paid: number;
  patient_paid: number;
  hospital_overcharge_high: number;
  hospital_overcharge_all: number;
  insurer_shortfall: number;
  fair_bill_high: number;
  fair_insurer_payable_high: number;
  fair_patient_payable_high: number;
  fair_patient_payable_all: number;
  recovery_likely: number;
  recovery_upper: number;
  entitlement_as_billed: Entitlement;
  entitlement_fair: Entitlement;
  notes: string[];
}

export interface PolicyTerms {
  sum_insured: number | null;
  room_rent_limit: number | null;
  icu_rent_limit: number | null;
  copay_network_pct: number;
  copay_non_network_pct: number;
  copay_senior_pct: number;
  senior_age: number | null;
  sub_limits: { procedure: string; amount: number; basis: string }[];
  non_medical_covered: boolean;
  clause_refs?: Record<string, string>;
  extraction: string;
}

export interface Letter {
  recipient: "insurer" | "hospital";
  to: string;
  subject: string;
  body: string;
  finding_ids: string[];
}

export interface BenchmarkComparison {
  line_no: number;
  code: string;
  description: string;
  region: string;
  region_basis: string;
  unit: string;
  billed_unit_rate: number;
  comparison_range: { p50: number; p90: number } | null;
  price_source: string | null;
  price_type: string;
  provider_id?: string | null;
  reference_date?: string | null;
  dataset_version?: string | null;
  comparable: boolean;
  missing_reason?: string | null;
  confidence_label?: string | null;
}

export interface HealthcareSource {
  source_name: string;
  verification_status?: string;
  page_number?: number | null;
  effective_date?: string | null;
  version?: string | null;
  source_url?: string | null;
  source_quote?: string | null;
}

export interface HealthcareFinding {
  finding_id?: string;
  title?: string;
  rule_name?: string;
  type: string;
  severity?: string;
  status?: string;
  billed_amount?: number | null;
  reference_amount?: number | null;
  potential_difference?: number | null;
  confidence?: string;
  confidence_score?: number | null;
  explanation?: string;
  policy?: { quote?: string } | null;
  evidence?: { source?: HealthcareSource } & Record<string, unknown>;
}

export interface HealthcareAudit {
  total_billed?: number | null;
  potential_discrepancy?: number | null;
  benchmark_variance?: number | null;
  finding_counts?: { clear?: number; flagged?: number; needs_review?: number };
  warnings?: string[];
  findings?: HealthcareFinding[];
}

export interface ClaimDocument {
  id?: string;
  filename: string;
  type_label: string;
  status: string;
  reason: string;
  text_characters?: number;
  fields_detected: string[];
  fields_not_detected: string[];
  evidence_excerpt?: string | null;
}

export interface ChecklistItem {
  label: string;
  status: string;
  requirement_kind: string;
  source: string;
  note: string;
  fields_not_detected?: string[];
}

export interface DocumentCheck {
  documents: ClaimDocument[];
  checklist: ChecklistItem[];
  summary: Record<string, number>;
  generic_recommendations_notice: string;
  export_csv: string;
}

export interface NextStep {
  priority: string;
  title: string;
  detail: string;
  basis: string;
  tool: string;
}

export interface ReviewClause {
  clause_id: string;
  title: string;
  text: string;
  page: number;
  source: string;
  status: string;
  explanation: string;
  next_step: string;
}

export interface AiProposal {
  clause_id: string;
  assessment: string;
  explanation: string;
  policy_quote: string;
  evidence: { filename: string; page: number; quote: string }[];
  missing_information: string[];
}

export interface ClaimReview {
  headline: string;
  notice: string;
  clause_count: number;
  clauses: ReviewClause[];
  document_check: DocumentCheck;
  next_steps: NextStep[];
  expenses: { line_no: number; description: string; status: string }[];
  ai_clause_review?: { mode: string; proposals: AiProposal[]; notice: string };
}

export interface CaseRecord {
  case_id: string;
  status: "running" | "complete" | "failed" | string;
  processing_stage?: string;
  error?: string;
  bill?: Bill;
  policy_terms?: PolicyTerms;
  findings?: Finding[];
  benchmark_comparisons?: BenchmarkComparison[];
  reconciliation?: Reconciliation;
  letters?: Letter[];
  files?: Record<string, string>;
  stack?: Stack;
  bill_name?: string;
  policy_name?: string;
  claim_review?: ClaimReview | null;
  healthcare_audit?: HealthcareAudit | null;
}
