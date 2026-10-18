import { useState } from "react";
import { Link } from "react-router-dom";
import { Landmark, Mail, Receipt, Scale, ShieldCheck, Sparkles, FileSpreadsheet } from "lucide-react";
import { Badge, Card, StatCard, Verdict, cx } from "../components/ui";
import { inr } from "../lib/format";
import type { CaseRecord } from "../lib/types";
import { FindingsLedger } from "./results/Ledger";
import { BenchmarkTable, BillTable, EntitlementTable, HealthcareAuditPanel } from "./results/Analysis";
import { ClaimReviewPanel, DownloadLinks, LettersPanel, TimelinePanel } from "./results/Panels";

export default function AuditResults({ record }: { record: CaseRecord }) {
  const [flashLine, setFlashLine] = useState<number | null>(null);
  const showLine = (n: number) => {
    setFlashLine(null);
    requestAnimationFrame(() => {
      setFlashLine(n);
      document.getElementById(`line-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const bill = record.bill;
  const findings = record.findings ?? [];
  const r = record.reconciliation;
  const letters = record.letters ?? [];
  const files = record.files ?? {};
  const isSample = !record.claim_review;
  const high = findings.filter((f) => f.confidence === "High").length;
  const reportUrl = files["reconciliation_report.pdf"];

  return (
    <div className="flex flex-col gap-6">
      {/* Case header */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-2.5 py-1 font-mono text-label-md text-white">
              <ShieldCheck className="size-3.5" aria-hidden /> {record.case_id}
            </span>
            {bill && (
              <span className="text-body-md text-muted">
                Patient: <b className="text-headline-sm text-ink">{bill.patient_name || "Not extracted"}</b>
              </span>
            )}
            {isSample && <Badge tone="info" icon={false}>Synthetic demo</Badge>}
            <Badge tone={record.status === "complete" ? "success" : "danger"}>{record.status === "complete" ? "Audit complete" : "Audit failed"}</Badge>
          </div>
          {bill && (
            <p className="mt-2 text-body-sm text-muted">
              Hospital: <span className="text-ink">{bill.hospital}</span> · Procedure: <span className="text-action">{bill.procedure}</span> · Stay {bill.admission_date} to {bill.discharge_date}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {reportUrl && (
            <a href={reportUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-label-md text-ink hover:bg-neutral-bg">
              <FileSpreadsheet className="size-4" aria-hidden /> Reconciliation report
            </a>
          )}
          {letters.length > 0 && (
            <button type="button" onClick={() => document.getElementById("letters")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-label-md text-white shadow-z1 hover:bg-action-hover">
              <Mail className="size-4" aria-hidden /> Dispute letters
            </button>
          )}
        </div>
      </Card>

      {record.claim_review && <ClaimReviewPanel review={record.claim_review} />}

      {record.status !== "complete" || !r ? (
        <Verdict tone="fail">
          The audit could not finish: {record.error || "unknown error"}. Check that the files are an itemised hospital bill and a policy wording.
        </Verdict>
      ) : (
        <>
          {findings.length === 0 ? (
            <Verdict tone="good">
              <b>No discrepancies found by the supported bill checks.</b> This does not confirm eligibility or rule out issues in clauses the system could not evaluate. Recorded patient amount: {inr(r.patient_paid)}.
            </Verdict>
          ) : (
            <Verdict tone="money">
              <b>{findings.length} item{findings.length > 1 ? "s" : ""} worth disputing</b> ({high} high-confidence). Recorded patient amount: {inr(r.patient_paid)}. Under the extracted terms and audit assumptions, the patient share would be <b>{inr(r.fair_patient_payable_high)}</b>. Confirm unresolved eligibility checks before relying on this scenario.
            </Verdict>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total billed" value={inr(r.billed_gross)} sub={`${bill?.line_items.length ?? 0} line items audited`} icon={<Receipt className="size-4" />} />
            <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-z1">
              <div className="flex items-start justify-between"><p className="text-label-sm uppercase text-muted">Insurer settlement</p><Landmark className="size-4 text-muted" aria-hidden /></div>
              <p className="tnum mt-2 text-headline-lg font-bold">{inr(r.insurer_paid)}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-action" style={{ width: `${r.billed_gross ? Math.min(100, (r.insurer_paid / r.billed_gross) * 100) : 0}%` }} /></div>
              <p className="mt-1 text-body-sm text-muted">{r.billed_gross ? `${Math.round((r.insurer_paid / r.billed_gross) * 100)}% of the bill` : ""} · check against your settlement letter</p>
            </div>
            <StatCard label="Estimated fair bill" value={inr(r.fair_bill_high)} sub={`You should owe ${inr(r.fair_patient_payable_high)} under the policy`} icon={<Scale className="size-4" />} />
            <StatCard
              hero
              label="Potential recovery"
              value={inr(r.recovery_likely)}
              sub={r.recovery_upper > r.recovery_likely + 0.5 ? `Up to ${inr(r.recovery_upper)} incl. items worth reviewing · not guaranteed` : `${findings.length} actionable item${findings.length === 1 ? "" : "s"} · not guaranteed`}
              icon={<Sparkles className="size-4" />}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-body-md">
              <span className="text-muted">Hospital overcharges (high confidence)</span>
              <span className="tnum font-semibold">{inr(r.hospital_overcharge_high)}{r.hospital_overcharge_all > r.hospital_overcharge_high + 0.5 && <span className="ml-1 font-normal text-muted">· up to {inr(r.hospital_overcharge_all)}</span>}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-body-md">
              <span className="text-muted">Insurer shortfall vs your policy</span>
              <span className="tnum font-semibold">{inr(r.insurer_shortfall)}</span>
            </div>
          </div>
          {r.notes.map((n, i) => (
            <p key={i} className="rounded-r-lg border-l-[3px] border-action bg-surface px-4 py-2 text-body-sm text-ink">{n}</p>
          ))}

          <section id="findings" className="min-w-0"><FindingsLedger findings={findings} bill={bill} onShowLine={showLine} /></section>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <EntitlementTable reconciliation={r} terms={record.policy_terms} />
            {bill && <BillTable bill={bill} findings={findings} flashLine={flashLine} />}
          </div>

          <HealthcareAuditPanel report={record.healthcare_audit} />
          <BenchmarkTable rows={record.benchmark_comparisons ?? []} />
          <LettersPanel caseId={record.case_id} letters={letters} files={files} />

          <div className={cx("flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy p-6 text-white shadow-z3")}>
            <div className="flex items-start gap-4">
              <span className="grid size-12 place-items-center rounded-lg bg-white/10"><Mail className="size-6" aria-hidden /></span>
              <div>
                <h2 className="text-headline-sm">Your dispute dossier is ready</h2>
                <p className="text-body-sm text-white/75">Formal letters to the insurer's grievance cell and the hospital billing desk, plus the reconciliation report as evidence.</p>
              </div>
            </div>
            <DownloadLinks caseId={record.case_id} files={files} letters={letters} tone="dark" />
          </div>

          <TimelinePanel caseId={record.case_id} />
        </>
      )}

      <div className="flex justify-center">
        <Link to="/audit/new" className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-2.5 text-body-md font-semibold text-ink hover:bg-neutral-bg">
          Audit another bill
        </Link>
      </div>
    </div>
  );
}
