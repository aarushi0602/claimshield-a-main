import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Eye, FileText, Gavel, Receipt, Scale, SlidersHorizontal } from "lucide-react";
import { Badge, Card, ConfidenceBadge, CopyButton, EmptyState, Quote, Select, cx } from "../../components/ui";
import { findingLabel, humanize, inr } from "../../lib/format";
import type { Bill, Finding } from "../../lib/types";

type EvidenceFilter = "all" | "verified" | "partial" | "insufficient";

const EVIDENCE_LABEL = { verified: "Verified", partial: "Partial evidence", insufficient: "Insufficient evidence" } as const;

function evidenceOf(f: Finding) {
  return f.evidence ?? { status: "insufficient" as const, bill_lines: [], policy: { status: "unavailable" }, calculation: { status: "partial", steps: [] } };
}

export function FilterChips({ findings, type, onType }: { findings: Finding[]; type: string | null; onType: (t: string | null) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>();
    for (const f of findings) {
      const g = m.get(f.type) ?? { count: 0, total: 0 };
      g.count += 1;
      g.total += f.impact;
      m.set(f.type, g);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [findings]);
  if (!groups.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter findings by type">
      <span className="text-label-sm uppercase text-muted">Filter findings:</span>
      <button type="button" onClick={() => onType(null)} aria-pressed={type === null} className={cx("rounded-full border px-3 py-1 text-label-md", type === null ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink hover:bg-neutral-bg")}>
        All · {findings.length}
      </button>
      {groups.map(([t, g]) => (
        <button
          key={t}
          type="button"
          onClick={() => onType(type === t ? null : t)}
          aria-pressed={type === t}
          className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-label-md", type === t ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink hover:bg-neutral-bg")}
        >
          <span className={cx("size-1.5 rounded-full", t === "COVERAGE_MISMATCH" ? "bg-action" : "bg-danger")} aria-hidden />
          {findingLabel(t)}
          <span className={cx("tnum rounded px-1.5 text-label-sm", type === t ? "bg-white/15" : "bg-neutral-bg text-muted")}>
            {inr(g.total)} · {g.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function Inspector({ finding, bill, onShowLine }: { finding: Finding; bill?: Bill; onShowLine: (n: number) => void }) {
  const [tab, setTab] = useState<"bill" | "policy">("bill");
  const evidence = evidenceOf(finding);
  const lines = finding.bill_lines.map((n) => bill?.line_items.find((l) => l.line_no === n)).filter(Boolean);
  const steps = evidence.calculation?.steps ?? [];

  return (
    <Card as="div" role="region" aria-label="Evidence inspector" className="overflow-hidden lg:sticky lg:top-20">
      <div className="bg-navy px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-label-sm uppercase text-white/80"><Eye className="size-3.5" aria-hidden /> Evidence inspector</p>
          <span className="rounded bg-teal-soft px-2 py-0.5 text-label-sm uppercase text-teal">Finding {finding.finding_id}</span>
        </div>
        <h3 className="mt-2 text-headline-sm">{finding.title}</h3>
        <p className="mt-1 text-body-sm text-white/75">
          {findingLabel(finding.type)} · raise with the {finding.counterparty} · {inr(finding.impact)} in question
        </p>
      </div>
      <div className="grid grid-cols-2 border-b border-line text-label-md" role="tablist">
        {([["bill", "Matched bill line", Receipt], ["policy", "Policy clause & rule", Gavel]] as const).map(([key, label, Icon]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cx("flex items-center justify-center gap-1.5 px-3 py-2.5", tab === key ? "border-b-2 border-action bg-surface text-action" : "bg-subtle text-muted hover:text-ink")}>
            <Icon className="size-3.5" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 p-5">
        {tab === "bill" ? (
          <>
            {lines.length ? (
              lines.map((l) => (
                <div key={l!.line_no} className="rounded-lg border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-label-sm uppercase text-muted">Extracted line data</p>
                    <button type="button" onClick={() => onShowLine(l!.line_no)} className="font-mono text-label-md text-action hover:underline">Line {l!.line_no}{l!.code ? ` · ${l!.code}` : ""}</button>
                  </div>
                  <dl className="tnum mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
                    <div><dt className="text-label-sm uppercase text-muted">Service</dt><dd className="text-ink">{l!.description}</dd></div>
                    <div><dt className="text-label-sm uppercase text-muted">Department</dt><dd className="text-ink">{l!.dept || "Not stated"}</dd></div>
                    <div><dt className="text-label-sm uppercase text-muted">Date · qty</dt><dd className="text-ink">{l!.service_date} · {l!.qty} × {inr(l!.unit_price)}</dd></div>
                    <div><dt className="text-label-sm uppercase text-muted">Billed</dt><dd className="font-semibold text-ink">{inr(l!.amount)}</dd></div>
                  </dl>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-subtle p-3 text-body-sm text-muted">This finding is about the insurer settlement rather than a single bill line.</p>
            )}
            <div>
              <p className="text-label-sm uppercase text-muted">Evidence on the bill</p>
              <p className="mt-1 text-body-md text-ink">{finding.bill_evidence}</p>
            </div>
            {(evidence.bill_lines ?? []).map((line) => (
              <div key={line.line_no} className="rounded-lg bg-subtle p-3 text-body-sm">
                <p className="text-label-sm uppercase text-muted">
                  Source row · line {line.line_no} · {line.page ? `p.${line.page}` : "page unavailable"}
                </p>
                <p className="mt-1 font-mono text-ink">{line.source_text || `Exact source row unavailable; normalised line: ${line.description ?? ""} · ${inr(line.amount)}`}</p>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="rounded-lg border border-line">
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
                <p className="flex items-center gap-1.5 text-label-md text-ink"><Scale className="size-3.5 text-action" aria-hidden /> Policy reference</p>
                {evidence.policy?.status === "verified" ? <Badge tone="teal">Verified clause</Badge> : <Badge tone="warning">Unverified</Badge>}
              </div>
              <div className="p-4">
                {evidence.policy?.status === "verified" ? (
                  <>
                    <p className="text-label-sm uppercase text-action">Clause {evidence.policy.clause_id} · {evidence.policy.title} · p.{evidence.policy.page}</p>
                    <Quote className="mt-2">“{evidence.policy.text}”</Quote>
                  </>
                ) : finding.policy ? (
                  <>
                    <p className="text-label-sm uppercase text-action">Clause {finding.policy.clause_id} · {finding.policy.title}</p>
                    <Quote className="mt-2">“{finding.policy.quote}”</Quote>
                    <p className="mt-2 text-body-sm text-muted">{evidence.policy?.reason || "The exact clause could not be verified in the parsed policy."}</p>
                  </>
                ) : (
                  <p className="text-body-sm text-muted">{evidence.policy?.reason || "No exact matching clause could be verified in the parsed policy."}</p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-line p-4">
              <p className="flex items-center gap-1.5 text-label-md text-ink"><ClipboardList className="size-3.5 text-action" aria-hidden /> Calculation · {humanize(evidence.calculation?.status || "partial")}</p>
              {steps.length ? (
                <ol className="tnum mt-2 flex flex-col gap-1.5 text-body-sm">
                  {steps.map((s, i) => (
                    <li key={i} className="flex justify-between gap-3 border-b border-neutral-bg pb-1.5 last:border-0">
                      <span className="text-muted">{s.label}</span>
                      <span className="font-semibold text-ink">{inr(s.result)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-body-sm text-muted">Intermediate inputs are unavailable; recorded impact is {inr(finding.impact)}.</p>
              )}
            </div>
          </>
        )}

        <div className={cx("rounded-lg border p-4", finding.confidence === "High" ? "border-teal/30 bg-teal-soft/40" : "border-warning/30 bg-warning-bg/60")}>
          <p className="flex items-center gap-1.5 text-label-md text-ink">
            {finding.confidence === "High" ? <CheckCircle2 className="size-4 text-teal" aria-hidden /> : <AlertTriangle className="size-4 text-warning" aria-hidden />}
            In plain language
          </p>
          <p className="mt-1 text-body-md text-ink">{finding.explanation}</p>
          {evidence.status === "insufficient" && <p className="mt-2 text-body-sm text-warning">Insufficient source evidence to verify this finding fully.</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-muted">
          <span>Detected by {finding.detected_by} via {finding.method}</span>
          <CopyButton text={`${finding.title}: ${finding.explanation}`} label="Copy for letter" />
        </div>
      </div>
    </Card>
  );
}

export function FindingsLedger({ findings, bill, onShowLine }: { findings: Finding[]; bill?: Bill; onShowLine: (n: number) => void }) {
  const [type, setType] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceFilter>("all");
  const shown = findings.filter((f) => (!type || f.type === type) && (evidence === "all" || evidenceOf(f).status === evidence));
  const [selectedId, setSelectedId] = useState<string | null>(findings[0]?.finding_id ?? null);
  const selected = shown.find((f) => f.finding_id === selectedId) ?? shown[0];
  const total = shown.reduce((s, f) => s + f.impact, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-z1">
        <FilterChips findings={findings} type={type} onType={setType} />
        <label className="flex items-center gap-2 text-label-md text-muted">
          <SlidersHorizontal className="size-3.5" aria-hidden /> Evidence
          <Select value={evidence} onChange={(e) => setEvidence(e.target.value as EvidenceFilter)} className="w-auto py-1">
            <option value="all">All findings</option>
            <option value="verified">Verified evidence</option>
            <option value="partial">Partial evidence</option>
            <option value="insufficient">Insufficient evidence</option>
          </Select>
        </label>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <h3 className="flex items-center gap-2 text-headline-sm text-ink">
              <FileText className="size-4 text-action" aria-hidden /> Itemised audit ledger
              <span className="rounded bg-neutral-bg px-2 py-0.5 text-label-sm text-muted">{shown.length} rows</span>
            </h3>
            <span className="hidden text-body-sm text-muted sm:block">Select a row to inspect its evidence</span>
          </div>
          {shown.length === 0 ? (
            <EmptyState>{findings.length ? "No findings match these filters." : "No discrepancies found on this bill."}</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-md">
                <thead>
                  <tr className="border-b border-line bg-subtle text-label-sm uppercase text-muted">
                    <th className="px-4 py-2.5">Finding</th>
                    <th className="px-4 py-2.5">Bill line</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Disputed</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((f) => {
                    const active = selected?.finding_id === f.finding_id;
                    const ev = evidenceOf(f).status;
                    return (
                      <tr
                        key={f.finding_id}
                        onClick={() => setSelectedId(f.finding_id)}
                        aria-selected={active}
                        className={cx("cursor-pointer border-b border-neutral-bg align-top transition-colors", active ? "bg-row-selected shadow-[inset_3px_0_0_var(--color-action)]" : "hover:bg-subtle")}
                      >
                        <td className="min-w-[15rem] px-4 py-3">
                          <p className="text-label-sm uppercase text-muted">{f.finding_id} · {findingLabel(f.type)}</p>
                          <p className="mt-0.5 font-medium text-ink">{f.title}</p>
                          <p className="text-body-sm text-muted">{f.policy ? `§${f.policy.clause_id} ${f.policy.title}` : "No policy clause"} · {f.counterparty}</p>
                        </td>
                        <td className="px-4 py-3">
                          {f.bill_lines.length ? (
                            <span className="flex flex-wrap gap-1">
                              {f.bill_lines.map((n) => (
                                <button key={n} type="button" onClick={(e) => { e.stopPropagation(); onShowLine(n); }} className="rounded bg-action-soft px-1.5 font-mono text-label-sm text-action hover:underline">
                                  L{n}
                                </button>
                              ))}
                            </span>
                          ) : (
                            <span className="text-body-sm text-muted">Settlement</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <ConfidenceBadge confidence={f.confidence} />
                            <Badge tone={ev === "verified" ? "success" : ev === "partial" ? "info" : "warning"} icon={false}>{EVIDENCE_LABEL[ev]}</Badge>
                          </div>
                        </td>
                        <td className="tnum whitespace-nowrap px-4 py-3 text-right font-semibold text-danger">+{inr(f.impact)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line bg-subtle px-5 py-2.5 text-body-sm text-muted">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-teal" aria-hidden /> Total in question: <b className="tnum text-ink">{inr(total)}</b></span>
            <span>{shown.length} of {findings.length} findings</span>
          </div>
        </Card>

        {selected ? <Inspector key={selected.finding_id} finding={selected} bill={bill} onShowLine={onShowLine} /> : null}
      </div>
    </div>
  );
}
