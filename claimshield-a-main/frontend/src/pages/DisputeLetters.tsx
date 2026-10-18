import { Link } from "react-router-dom";
import { FileText, Mail } from "lucide-react";
import { Badge, Card, EmptyState, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import { humanize, inr } from "../lib/format";
import { useDashboard } from "./CaseHistory";

/** Every completed audit's dispute dossier, newest first. Letters open on the case page. */
export default function DisputeLetters() {
  const { data, error, loading } = useDashboard();
  const claims = data?.claims ?? [];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dispute letters"
        description="Open a case to read, copy or download its letters to the insurer and the hospital, plus the reconciliation report."
      />
      <ErrorBanner message={error} />
      {loading && !data ? (
        <div className="py-10 text-center"><Spinner label="Loading cases…" /></div>
      ) : claims.length === 0 ? (
        <Card><EmptyState>No audits yet. <Link to="/audit/new" className="text-action hover:underline">Run your first audit</Link> to generate dispute letters.</EmptyState></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {claims.map((c) => (
            <Card key={c.claim_id} as="article" className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-label-md text-navy">{c.sample_id || c.claim_id}</span>
                {c.estimated_recovery > 0 ? <Badge tone="teal">Letters ready</Badge> : <Badge tone="success">Nothing to dispute</Badge>}
              </div>
              <p className="text-headline-sm text-ink">{c.provider || "Provider not recorded"}</p>
              <dl className="tnum grid grid-cols-2 gap-y-1 text-body-sm">
                <dt className="text-muted">Claimed</dt><dd className="text-right">{inr(c.claimed_amount)}</dd>
                <dt className="text-muted">Estimated recovery</dt><dd className="text-right font-semibold text-teal">{inr(c.estimated_recovery)}</dd>
                <dt className="text-muted">Dispute status</dt><dd className="text-right capitalize">{humanize(c.dispute_status)}</dd>
              </dl>
              <div className="mt-auto flex gap-2 pt-2">
                <Link to={`/cases/${c.claim_id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-action px-3 py-2 text-label-md text-white hover:bg-action-hover">
                  <Mail className="size-4" aria-hidden /> Open letters
                </Link>
                <a href={`/api/cases/${encodeURIComponent(c.claim_id)}/files/reconciliation_report.pdf`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-label-md text-ink hover:bg-neutral-bg">
                  <FileText className="size-4" aria-hidden /> Report
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
