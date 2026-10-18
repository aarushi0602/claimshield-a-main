import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge, Button, Card, ConfidenceBadge, EmptyState, ErrorBanner, Notice, PageHeader, Pill, Spinner, StatCard, Textarea } from "../../components/ui";
import { getJson, sendJson } from "../../lib/api";
import { humanize, inr } from "../../lib/format";

interface ReviewFinding {
  finding_id: string;
  title: string;
  type: string;
  confidence: string;
  classification: string;
  impact: number;
  evidence: unknown;
  disclaimer: string;
  human_outcome?: string | null;
  reviewer_explanation?: string;
  disagreement?: boolean;
}

interface QueueItem {
  case_id: string;
  sample_bill_id?: string | null;
  bill_name: string;
  status: string;
  clean_bill: boolean;
  finding_count: number;
  message?: string;
  findings: ReviewFinding[];
}

interface Evaluation {
  synthetic_dataset_version: string;
  synthetic_confusion_matrix: { false_positive: number; true_negative: number; true_positive: number; false_negative: number; inconclusive: number; false_positive_rate: number | null };
  reviewer_outcomes: { reviewed_findings: number; false_positive_count: number; reviewer_disagreements: number; note: string };
  notice: string;
}

const OUTCOMES = [["confirmed_issue", "Confirm issue"], ["legitimate_charge", "Legitimate charge"], ["inconclusive", "Inconclusive"]];

function FindingReview({ caseId, f, onSaved }: { caseId: string; f: ReviewFinding; onSaved: () => Promise<void> }) {
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const decide = async (outcome: string) => {
    if (explanation.trim().length < 3) {
      setError("Enter a short reviewer explanation before recording an outcome.");
      return;
    }
    setBusy(outcome);
    setError(null);
    try {
      await sendJson(`/api/reviewer/cases/${encodeURIComponent(caseId)}/findings/${encodeURIComponent(f.finding_id)}`, { outcome, explanation: explanation.trim() }, "POST", "Could not save the review outcome.");
      setExplanation("");
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label-md text-ink">{f.title}</p>
        <span className="flex items-center gap-2"><ConfidenceBadge confidence={f.confidence} /><Badge tone="neutral" icon={false}>{humanize(f.classification)}</Badge></span>
      </div>
      <p className="mt-1 text-body-sm text-muted">{f.type} · Impact: {inr(f.impact)}</p>
      <details className="mt-2"><summary className="text-body-sm text-action">Evidence</summary><pre className="mt-1 max-h-60 overflow-auto rounded bg-subtle p-2 font-mono text-[0.7rem]">{JSON.stringify(f.evidence, null, 2)}</pre></details>
      <p className="mt-2 text-body-sm text-muted">{f.disclaimer}</p>
      {f.human_outcome && (
        <Notice className="mt-2">
          Outcome: <b className="capitalize">{humanize(f.human_outcome)}</b> · {f.reviewer_explanation}
          {f.disagreement && <Badge tone="warning" className="ml-2">Reviewer disagreement recorded</Badge>}
        </Notice>
      )}
      <label className="mt-3 flex flex-col gap-1 text-label-md">Reviewer explanation
        <Textarea rows={2} maxLength={2000} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Describe the evidence behind your decision" />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {OUTCOMES.map(([v, l]) => <Button key={v} variant="secondary" size="sm" busy={busy === v} onClick={() => decide(v)}>{l}</Button>)}
      </div>
      <div className="mt-2"><ErrorBanner message={error} /></div>
    </div>
  );
}

export default function Reviewer() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setError(null);
    try {
      setItems((await getJson<{ items: QueueItem[] }>("/api/reviewer/queue", "Could not load the reviewer queue.")).items);
    } catch (e) {
      setItems([]);
      setError((e as Error).message);
    }
  }, []);
  const loadEvaluation = useCallback(async () => {
    try {
      setEvaluation(await getJson<Evaluation>("/api/reviewer/evaluation", "Could not load false-positive analysis."));
      setEvalError(null);
    } catch (e) {
      setEvalError((e as Error).message);
    }
  }, []);
  const refresh = useCallback(async () => {
    await Promise.all([loadQueue(), loadEvaluation()]);
  }, [loadQueue, loadEvaluation]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const m = evaluation?.synthetic_confusion_matrix;
  const o = evaluation?.reviewer_outcomes;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Pill>Professional workspace</Pill>}
        title="Insurer-side claim review"
        description="Separate reviewer workspace for claims in your authenticated tenant. Audit findings are advisory and never automatic fraud determinations."
        actions={<Button variant="secondary" onClick={refresh}><RefreshCw className="size-4" aria-hidden /> Refresh queue</Button>}
      />
      <Notice tone="info">Access requires an explicitly configured reviewer account. Review evidence and outcomes are stored with the case.</Notice>
      <ErrorBanner message={error} />
      <Card className="p-6">
        <h2 className="mb-3 text-headline-sm text-ink">False-positive analysis</h2>
        {evaluation && m && o ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="False positives" value={m.false_positive} sub={`Rate ${m.false_positive_rate == null ? "n/a" : `${(m.false_positive_rate * 100).toFixed(1)}%`}`} />
              <StatCard label="True negatives" value={m.true_negative} />
              <StatCard label="True positives" value={m.true_positive} />
              <StatCard label="False negatives" value={m.false_negative} />
              <StatCard label="Inconclusive" value={m.inconclusive} />
            </div>
            <p className="mt-3 text-body-sm text-muted">Synthetic test set {evaluation.synthetic_dataset_version} · Human review: {o.reviewed_findings} reviewed, {o.false_positive_count} marked legitimate, {o.reviewer_disagreements} disagreements. {o.note}</p>
            <p className="mt-1 text-body-sm text-muted">{evaluation.notice}</p>
          </>
        ) : evalError ? <p className="text-body-sm text-muted">{evalError}</p> : <Spinner label="Loading analysis…" />}
      </Card>
      <div className="flex flex-col gap-4">
        {items === null ? (
          <Spinner label="Loading review queue…" />
        ) : items.length === 0 ? (
          !error && <Card><EmptyState>No completed claim audits are available in this tenant review queue yet.</EmptyState></Card>
        ) : (
          items.map((item) => (
            <Card key={item.case_id} as="article" className="p-6">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-headline-sm text-ink">
                    {item.sample_bill_id || item.bill_name || item.case_id}
                    {item.clean_bill ? <Badge tone="success">0 findings</Badge> : <Badge tone="warning">{item.finding_count} findings</Badge>}
                  </h3>
                  <p className="text-body-sm text-muted">Case {item.case_id} · {item.bill_name}</p>
                </div>
                <span className="text-body-sm text-muted">{item.status}</span>
              </div>
              {item.clean_bill ? (
                <Notice>{item.message} This clean bill stays visible for false-positive analysis.</Notice>
              ) : (
                <div className="flex flex-col gap-3">{item.findings.map((f) => <FindingReview key={f.finding_id} caseId={item.case_id} f={f} onSaved={refresh} />)}</div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
