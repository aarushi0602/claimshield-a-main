import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, RefreshCw } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBanner, Input, Notice, PageHeader, Select, Spinner, StatCard } from "../components/ui";
import { getJson, sendJson } from "../lib/api";
import { humanize, inr } from "../lib/format";

export interface DashboardClaim {
  claim_id: string;
  sample_id?: string | null;
  claim_date?: string | null;
  provider?: string | null;
  status: string;
  claimed_amount: number;
  assessed_payable_amount: number | null;
  actual_settled_amount: number | null;
  actual_settlement_source: string;
  confirmed_recovery: number | null;
  estimated_recovery: number;
  deductions: { label: string; amount: number }[];
  dispute_status: string;
  outstanding_documents: string[];
  pending_actions: string[];
  simulated_demo_data: boolean;
}

export interface Dashboard {
  notice: string;
  simulated_demo_claims?: number;
  summary: {
    claim_count: number;
    claimed_amount: number;
    assessed_payable_amount: number;
    actual_settled_amount: number;
    settlements_recorded: number;
    deductions: number;
    estimated_recovery: number;
    estimated_recovery_upper: number;
    confirmed_recovery: number;
    confirmed_recovery_records: number;
  };
  claims: DashboardClaim[];
}

const DISPUTE = [["not_recorded", "Not recorded"], ["no_dispute", "No dispute"], ["drafting", "Drafting"], ["submitted", "Submitted"], ["pending", "Pending"], ["resolved", "Resolved"]];

export function useDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJson<Dashboard>("/api/dashboard", "Could not load your claim history."));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { data, error, loading, load, setError };
}

function OutcomeEditor({ claim, onSaved, onError }: { claim: DashboardClaim; onSaved: () => void; onError: (m: string) => void }) {
  const [settled, setSettled] = useState(claim.actual_settled_amount?.toString() ?? "");
  const [recovery, setRecovery] = useState(claim.confirmed_recovery?.toString() ?? "");
  const [dispute, setDispute] = useState(claim.dispute_status);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const body: Record<string, unknown> = { dispute_status: dispute };
    if (settled !== "") body.actual_settled_amount = Number(settled);
    if (recovery !== "") body.confirmed_recovery = Number(recovery);
    setBusy(true);
    try {
      await sendJson(`/api/cases/${encodeURIComponent(claim.claim_id)}/claim-outcome`, body, "PUT", "Could not save claim outcome.");
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <label className="text-body-sm text-muted">Actual settled<Input type="number" min={0} step="0.01" value={settled} placeholder="Unreported" onChange={(e) => setSettled(e.target.value)} /></label>
      <label className="text-body-sm text-muted">Confirmed recovery<Input type="number" min={0} step="0.01" value={recovery} placeholder="Unreported" onChange={(e) => setRecovery(e.target.value)} /></label>
      <label className="text-body-sm text-muted">Dispute status
        <Select value={dispute} onChange={(e) => setDispute(e.target.value)}>
          {DISPUTE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </label>
      <div className="flex items-end"><Button variant="secondary" size="sm" onClick={save} busy={busy} className="w-full">Save outcome</Button></div>
    </div>
  );
}

function Bar({ label, value, max, cls, missing }: { label: string; value: number; max: number; cls: string; missing?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-body-sm"><span className="text-muted">{label}</span><span className="tnum">{missing ? "Not recorded" : inr(value)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-bg"><div className={`h-full rounded-full ${cls}`} style={{ width: `${missing ? 0 : Math.max(0, Math.min(100, (value / max) * 100))}%` }} /></div>
    </div>
  );
}

export default function CaseHistory() {
  const { data, error, loading, load, setError } = useDashboard();
  const s = data?.summary;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Case history"
        description="Your audit history, claim updates, settlement entries and estimated recovery in one view."
        actions={
          <>
            <Button variant="secondary" onClick={load} busy={loading}><RefreshCw className="size-4" aria-hidden /> Refresh</Button>
            <a href="/api/dashboard/export.csv" className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-body-md font-semibold text-ink hover:bg-neutral-bg">
              <Download className="size-4" aria-hidden /> Export CSV
            </a>
          </>
        }
      />
      <ErrorBanner message={error} />
      {data && (
        <Notice>
          {data.notice}
          {data.simulated_demo_claims ? ` ${data.simulated_demo_claims} synthetic sample claim(s) are labelled simulated demo data.` : ""}
        </Notice>
      )}
      {s && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          <StatCard label="Claims" value={s.claim_count} sub="Stored claim records" />
          <StatCard label="Claimed" value={inr(s.claimed_amount)} sub="Gross amount on bills" />
          <StatCard label="Assessed payable" value={inr(s.assessed_payable_amount)} sub="Policy replay estimate" />
          <StatCard label="Actual settled" value={inr(s.actual_settled_amount)} sub={`${s.settlements_recorded} manually recorded`} />
          <StatCard label="Deductions" value={inr(s.deductions)} sub="Extracted from bills" />
          <StatCard hero label="Estimated recovery" value={inr(s.estimated_recovery)} sub={`Upper estimate ${inr(s.estimated_recovery_upper)}`} />
          <StatCard label="Confirmed recovery" value={inr(s.confirmed_recovery)} sub={`${s.confirmed_recovery_records} manually recorded`} />
        </div>
      )}
      <Card>
        <CardHeader title="Claims" subtitle="Record what the insurer actually settled and any confirmed recovery. Entries are your own and are not verified by ClaimShield." />
        {loading && !data ? (
          <div className="p-8 text-center"><Spinner label="Loading claim history…" /></div>
        ) : !data?.claims.length ? (
          <EmptyState>No completed claims are recorded for your account yet. <Link to="/audit/new" className="text-action hover:underline">Start an audit</Link>.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {data.claims.map((c) => {
              const outstanding = [...c.outstanding_documents.map((v) => `Document: ${v}`), ...c.pending_actions];
              const max = Math.max(c.claimed_amount, c.assessed_payable_amount || 0, c.actual_settled_amount || 0, 1);
              return (
                <li key={c.claim_id} className="grid gap-5 px-6 py-5 lg:grid-cols-[1.2fr_1fr]">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/cases/${c.claim_id}`} className="font-mono text-label-md text-action hover:underline">{c.sample_id || c.claim_id}</Link>
                      {c.simulated_demo_data ? <Badge tone="info" icon={false}>Simulated demo</Badge> : <Badge tone="neutral" icon={false}>User claim</Badge>}
                      <Badge tone="neutral">{humanize(c.status)}</Badge>
                    </div>
                    <p className="text-body-md text-ink">{c.provider || "Provider not recorded"} <span className="text-muted">· {c.claim_date || "Date not recorded"}</span></p>
                    <p className="text-body-sm text-muted">
                      Deductions: {c.deductions.length ? c.deductions.map((d) => `${d.label} ${inr(d.amount)}`).join(" · ") : "None recorded"} · Dispute: {humanize(c.dispute_status)}
                    </p>
                    {outstanding.length > 0 && <Notice tone="warning">{outstanding.join(" · ")}</Notice>}
                    <OutcomeEditor claim={c} onSaved={load} onError={setError} />
                  </div>
                  <div className="flex flex-col gap-2 rounded-lg bg-subtle p-4">
                    <Bar label="Claimed" value={c.claimed_amount} max={max} cls="bg-navy" />
                    <Bar label="Assessed payable (estimate)" value={c.assessed_payable_amount || 0} max={max} cls="bg-action" missing={c.assessed_payable_amount == null} />
                    <Bar label="Actual settled" value={c.actual_settled_amount || 0} max={max} cls="bg-teal" missing={c.actual_settled_amount == null} />
                    <p className="mt-1 text-body-sm text-muted">
                      Estimated recovery {inr(c.estimated_recovery)} · Confirmed {c.confirmed_recovery == null ? "not recorded" : inr(c.confirmed_recovery)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
