import { Calculator, Landmark, ListChecks, Receipt } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, Notice, StatCard, Table, cx } from "../../components/ui";
import { humanize, inr, inrOr } from "../../lib/format";
import type { BenchmarkComparison, Bill, Finding, HealthcareAudit, PolicyTerms, Reconciliation } from "../../lib/types";

/** Policy entitlement as billed vs after the high-confidence corrections, side by side. */
export function EntitlementTable({ reconciliation, terms }: { reconciliation: Reconciliation; terms?: PolicyTerms }) {
  const a = reconciliation.entitlement_as_billed;
  const f = reconciliation.entitlement_fair;
  const rows: [string, number, number, boolean?][] = [
    ["Bill amount", a.gross, f.gross],
    ["Less: items the policy doesn't pay for", -a.non_payable, -f.non_payable],
    ["Less: room rent above the limit", -a.room_excess, -f.room_excess],
    ["Admissible amount", a.admissible, f.admissible],
    [f.sub_limit_applied != null ? `After sub-limit (cap ${inr(f.sub_limit_applied)})` : "After sub-limit (none applies)", a.after_sub_limit, f.after_sub_limit],
    [`Less: co-payment at ${f.copay_pct}%`, -a.copay, -f.copay],
    ["Insurer should pay", a.insurer_payable, f.insurer_payable, true],
    ["You should pay", a.patient_payable, f.patient_payable, true],
  ];
  const money = (v: number) => (v < 0 ? `−${inr(-v)}` : inr(v));
  const refs = terms?.clause_refs ?? {};
  const ref = (k: string) => (refs[k] ? ` (§${refs[k]})` : "");
  const items: string[] = [];
  if (terms) {
    if (terms.sum_insured) items.push(`Sum insured ${inr(terms.sum_insured)}${ref("sum_insured")}`);
    if (terms.room_rent_limit) items.push(`Room rent up to ${inr(terms.room_rent_limit)}/day${terms.icu_rent_limit ? `, ICU ${inr(terms.icu_rent_limit)}/day` : ""}${ref("room_rent")}`);
    items.push(`Co-payment ${terms.copay_network_pct}% at network, ${terms.copay_non_network_pct}% at non-network hospitals${terms.copay_senior_pct ? `, +${terms.copay_senior_pct}% if aged ${terms.senior_age}+` : ""}${ref("copay")}`);
    if (terms.sub_limits.length) items.push(`Sub-limits: ${terms.sub_limits.map((s) => `${s.procedure} ${inr(s.amount)}/${s.basis}`).join("; ")}${ref("sub_limit")}`);
    items.push(`Non-medical items ${terms.non_medical_covered ? "covered" : "not covered"}${ref("non_medical")}`);
    items.push(`Extracted by ${terms.extraction}`);
  }
  return (
    <Card>
      <CardHeader icon={<Calculator className="size-4" />} title="How your entitlement was calculated" subtitle="Your policy's terms applied to the bill as printed, then after the high-confidence corrections." />
      <Table head={["Step", <span className="block text-right">Policy on bill as printed</span>, <span className="block text-right">After corrections</span>]}>
        {rows.map(([label, before, after, total]) => (
          <tr key={label} className={cx(total && "bg-subtle font-semibold")}>
            <td className="px-4 py-2.5 text-ink">{label}</td>
            <td className="tnum px-4 py-2.5 text-right">{money(before)}</td>
            <td className={cx("tnum px-4 py-2.5 text-right", Math.abs(after - before) > 0.5 && "text-action")}>{money(after)}</td>
          </tr>
        ))}
      </Table>
      {items.length > 0 && (
        <div className="border-t border-line px-6 py-4">
          <p className="text-label-sm uppercase text-muted">Policy terms used</p>
          <ul className="mt-2 grid gap-1 text-body-sm text-ink md:grid-cols-2">
            {items.map((i) => <li key={i} className="flex gap-2"><span className="text-action">•</span>{i}</li>)}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function BillTable({ bill, findings, flashLine }: { bill: Bill; findings: Finding[]; flashLine: number | null }) {
  const flags: Record<number, { ids: string[]; high: boolean }> = {};
  for (const f of findings)
    for (const n of f.bill_lines) {
      const cur = flags[n] ?? { ids: [], high: false };
      cur.ids.push(f.finding_id);
      cur.high ||= f.confidence === "High";
      flags[n] = cur;
    }
  return (
    <Card>
      <CardHeader
        icon={<Receipt className="size-4" />}
        title="Itemised bill"
        subtitle={`${bill.hospital} · bill ${bill.bill_number} · ${bill.patient_name}${bill.patient_age != null ? ` (${bill.patient_age})` : ""} · ${bill.admission_date} to ${bill.discharge_date}`}
      />
      <div className="max-h-[480px] overflow-auto">
        <Table head={["#", "Date", "Description", <span className="block text-right">Qty</span>, <span className="block text-right">Rate</span>, <span className="block text-right">Amount</span>]}>
          {bill.line_items.map((li) => {
            const fl = flags[li.line_no];
            return (
              <tr
                key={`${li.line_no}-${flashLine === li.line_no ? "f" : ""}`}
                id={`line-${li.line_no}`}
                className={cx(fl && (fl.high ? "bg-teal-soft/40" : "bg-warning-bg/60"), flashLine === li.line_no && "animate-flash-row")}
              >
                <td className="tnum px-4 py-2 text-muted">{li.line_no}</td>
                <td className="tnum whitespace-nowrap px-4 py-2 font-mono text-body-sm">{li.service_date}</td>
                <td className="px-4 py-2">
                  {li.description}
                  {fl && <span className={cx("ml-2 text-label-sm", fl.high ? "text-teal" : "text-warning")}>{fl.ids.join(" ")}</span>}
                </td>
                <td className="tnum px-4 py-2 text-right">{li.qty}</td>
                <td className="tnum px-4 py-2 text-right">{inr(li.unit_price)}</td>
                <td className="tnum px-4 py-2 text-right">{inr(li.amount)}</td>
              </tr>
            );
          })}
          <tr className="bg-subtle font-semibold">
            <td colSpan={5} className="px-4 py-2">Gross total (as printed)</td>
            <td className="tnum px-4 py-2 text-right">{inr(bill.stated_gross_total)}</td>
          </tr>
          {bill.deductions.map((d) => (
            <tr key={d.label + d.basis} className="text-muted">
              <td colSpan={5} className="px-4 py-2 text-body-sm">Insurer deduction: {d.label} · {d.basis}</td>
              <td className="tnum px-4 py-2 text-right">{inr(d.amount)}</td>
            </tr>
          ))}
        </Table>
      </div>
    </Card>
  );
}

export function BenchmarkTable({ rows }: { rows: BenchmarkComparison[] }) {
  return (
    <Card>
      <CardHeader
        icon={<Landmark className="size-4" />}
        title="Regional charge comparisons"
        subtitle="Informational price references can identify rates worth reviewing. A high charge alone does not establish fraud, overbilling or a contractual violation."
      />
      {rows.length === 0 ? (
        <EmptyState>No charge comparisons were returned.</EmptyState>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <Table head={["Charge", "Region / unit", <span className="block text-right">Billed rate</span>, "Comparison range", "Source", "Assessment"]}>
            {rows.map((r) => (
              <tr key={`${r.line_no}-${r.code}`}>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{r.description}</p>
                  <p className="font-mono text-body-sm text-muted">{r.code || "No reference code"}</p>
                </td>
                <td className="px-4 py-2.5 text-body-sm">{r.region || "Unknown region"}<p className="text-muted">{r.unit} · {r.region_basis}</p></td>
                <td className="tnum px-4 py-2.5 text-right font-semibold">{inr(r.billed_unit_rate)}</td>
                <td className="tnum px-4 py-2.5 text-body-sm">{r.comparison_range ? `${inr(r.comparison_range.p50)} – ${inr(r.comparison_range.p90)}` : <span className="text-muted">{r.missing_reason || "No comparable pricing data"}</span>}</td>
                <td className="px-4 py-2.5 text-body-sm">
                  {r.price_source || "No source"}
                  <p className="text-muted">{r.price_type === "contracted_tariff" ? "Contracted tariff" : "Informational benchmark"} · {r.reference_date || "date unavailable"} · {r.dataset_version || "unversioned"}</p>
                </td>
                <td className="px-4 py-2.5">
                  {r.confidence_label ? <Badge tone="warning">Worth reviewing</Badge> : r.comparable ? <Badge tone="success">Within range</Badge> : <Badge tone="neutral">No comparison</Badge>}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </Card>
  );
}

/** Healthcare policy & reference checks. Hidden entirely when the report has no counts. */
export function HealthcareAuditPanel({ report }: { report: HealthcareAudit | null | undefined }) {
  if (!report || !report.finding_counts) return null;
  const counts = report.finding_counts;
  return (
    <Card data-testid="healthcare-audit-panel">
      <CardHeader
        icon={<ListChecks className="size-4" />}
        title="Healthcare policy and reference checks"
        subtitle="Potential adjustments are audit scenarios. CGHS/PM-JAY benchmark variances are shown separately and do not determine insurer liability."
      />
      <div className="grid gap-3 p-5 sm:grid-cols-3 xl:grid-cols-6" data-testid="healthcare-audit-summary">
        <StatCard label="Billed total" value={inrOr(report.total_billed)} />
        <StatCard label="Potential adjustment scenario" value={inrOr(report.potential_discrepancy)} />
        <StatCard label="Benchmark variance · separate" value={inrOr(report.benchmark_variance)} />
        <StatCard label="Clear checks" value={counts.clear ?? 0} />
        <StatCard label="Flagged checks" value={counts.flagged ?? 0} />
        <StatCard label="Needs review" value={counts.needs_review ?? 0} />
      </div>
      {(report.warnings ?? []).length > 0 && (
        <div className="flex flex-col gap-2 px-5 pb-4" role="status" data-testid="healthcare-audit-warnings">
          {report.warnings!.map((w, i) => <Notice key={i} tone="warning">{w}</Notice>)}
        </div>
      )}
      <div className="max-h-[480px] overflow-auto">
        <Table head={["Check / status", "Severity", <span className="block text-right">Billed</span>, <span className="block text-right">Reference</span>, <span className="block text-right">Difference</span>, "Confidence", "Explanation / source"]}>
          {(report.findings ?? []).length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">No item-level checks are available. Review the warnings above.</td></tr>
          ) : (
            report.findings!.map((finding, i) => {
              const source = finding.evidence?.source;
              const quote = source?.source_quote || finding.policy?.quote;
              return (
                <tr key={finding.finding_id ?? i} className="align-top" data-testid="healthcare-audit-row">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{finding.title || finding.rule_name}</p>
                    <p className="text-body-sm text-muted">{finding.type}</p>
                    <Badge tone={finding.status === "clear" ? "success" : "warning"} className="mt-1">{humanize(finding.status || "needs_review")}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-body-sm">{finding.severity || "warning"}</td>
                  <td className="tnum px-4 py-2.5 text-right">{inrOr(finding.billed_amount)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{inrOr(finding.reference_amount)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{inrOr(finding.status === "needs_review" ? null : finding.potential_difference)}</td>
                  <td className="px-4 py-2.5 text-body-sm">
                    {finding.confidence}
                    {typeof finding.confidence_score === "number" && <p className="text-muted">{finding.confidence_score.toFixed(2)} · check confidence</p>}
                  </td>
                  <td className="max-w-md px-4 py-2.5 text-body-sm">
                    {finding.explanation}
                    <details className="mt-1">
                      <summary className="text-action">Source and calculation</summary>
                      <div className="mt-1 text-muted">
                        {source ? (
                          <>
                            <p className="font-semibold text-ink">{source.source_name}</p>
                            <p>Source status: {source.verification_status || "unverified"}</p>
                            <p>Page: {source.page_number ?? "Unavailable"} · Effective: {source.effective_date ?? "Unavailable"}</p>
                            <p>Version: {source.version ?? "Unavailable"}</p>
                            {source.source_url && <p className="break-all">{source.source_url}</p>}
                            {quote && <blockquote className="mt-1 border-l-2 border-navy pl-2 italic">{quote}</blockquote>}
                          </>
                        ) : (
                          <p>Source unavailable; no verified reference is inferred.</p>
                        )}
                        <pre className="mt-1 max-h-48 overflow-auto rounded bg-subtle p-2 font-mono text-[0.7rem]">{JSON.stringify(finding.evidence || {}, null, 2)}</pre>
                      </div>
                    </details>
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      </div>
    </Card>
  );
}
