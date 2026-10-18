import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Download, FileText, ListTodo, Mail, Send } from "lucide-react";
import { Badge, Button, Card, CardHeader, CopyButton, Disclosure, ErrorBanner, Field, Input, Notice, Quote, Select, StatCard, cx } from "../../components/ui";
import { apiFetch, getJson, postForm, sendJson } from "../../lib/api";
import { humanize } from "../../lib/format";
import type { ClaimReview, Letter } from "../../lib/types";

// Next-step `tool` values come from the backend (claimshield/services/review.py) and predate the
// React routes, so map them here.
export const TOOL_ROUTES: Record<string, string> = {
  "claim-dashboard-panel": "/history",
  "document-check-panel": "/tools/documents",
  "preauth-panel": "/tools/preauth",
  "policy-explainer-panel": "/tools/policy-explainer",
  "rejection-panel": "/tools/rejection",
  "preclaim-panel": "/tools/preclaim",
  "what-if-panel": "/tools/what-if",
  "policy-history-panel": "/tools/policy-history",
};

/** Next steps that point at a section of the results page itself. */
const IN_PAGE: Record<string, string> = { "findings-panel": "findings", "timeline-panel": "timeline" };

const AI_LABELS: Record<string, string> = {
  potentially_eligible: "Potentially eligible under this clause",
  potentially_ineligible: "Potentially excluded under this clause",
  needs_verification: "More evidence needed",
};

export function ClaimReviewPanel({ review }: { review: ClaimReview }) {
  const check = review.document_check;
  const ai = review.ai_clause_review ?? { mode: "unavailable", proposals: [], notice: "AI clause comparison unavailable." };
  const Step = ({ s }: { s: ClaimReview["next_steps"][number] }) => (
    <li className="flex flex-col gap-1.5 rounded-lg border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <Badge tone="warning">{s.priority}</Badge>
        {TOOL_ROUTES[s.tool] ? (
          <Link to={TOOL_ROUTES[s.tool]} className="text-label-md text-action hover:underline">Open related tool →</Link>
        ) : IN_PAGE[s.tool] ? (
          <button type="button" onClick={() => document.getElementById(IN_PAGE[s.tool])?.scrollIntoView({ behavior: "smooth" })} className="text-label-md text-action hover:underline">
            Go to section →
          </button>
        ) : null}
      </div>
      <p className="text-label-md text-ink">{s.title}</p>
      <p className="text-body-sm text-ink">{s.detail}</p>
      <p className="text-body-sm text-muted">{s.basis}</p>
    </li>
  );
  return (
    <Card>
      <CardHeader icon={<ListTodo className="size-4" />} title={review.headline} subtitle="Your claim review: documents, policy clauses and the actions to take next." />
      <div className="flex flex-col gap-5 p-6">
        <Notice>{review.notice}</Notice>
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="Eligibility" value="Needs verification" sub="Unresolved checks are not a rejection." />
          <StatCard label="Policy clauses extracted" value={review.clause_count} sub="Each clause is listed below." />
          <StatCard label="Document checklist" value={`${check.summary.missing ?? 0} missing · ${check.summary.uncertain ?? 0} to check`} sub="Generic recommendations unless a verified insurer source is shown." />
        </div>
        <div>
          <h4 className="mb-2 text-label-md text-ink">Start with these actions</h4>
          <ol className="grid gap-3 md:grid-cols-3">{review.next_steps.slice(0, 3).map((s, i) => <Step key={i} s={s} />)}</ol>
        </div>
        {review.next_steps.length > 3 && (
          <Disclosure summary={`See the full action plan (${review.next_steps.length - 3} more)`}>
            <ol className="grid gap-3 md:grid-cols-2">{review.next_steps.slice(3).map((s, i) => <Step key={i} s={s} />)}</ol>
          </Disclosure>
        )}
        <Disclosure summary="Documents received and missing evidence">
          <div className="flex flex-col gap-2">
            {check.documents.map((d, i) => (
              <div key={i} className="rounded-lg border border-line p-3 text-body-sm">
                <p><b>{d.filename}</b> · {d.type_label}</p>
                <p className="text-muted">{d.reason}</p>
                {d.fields_not_detected.length > 0 && <p className="text-warning">Check these fields: {d.fields_not_detected.join(", ")}</p>}
              </div>
            ))}
            <ul className="mt-1 grid gap-1 text-body-sm md:grid-cols-2">
              {check.checklist.map((c, i) => (
                <li key={i}><b>{c.label}</b>: {humanize(c.status)} · {c.requirement_kind}</li>
              ))}
            </ul>
          </div>
        </Disclosure>
        <Disclosure summary={`Review every extracted policy clause (${review.clause_count})`}>
          <p className="mb-3 text-body-sm text-muted">Extraction may miss unnumbered clauses, schedules or scans. Check the original wording. A clause listed here is not automatically satisfied.</p>
          <div className="flex flex-col gap-3">
            {review.clauses.map((c) => (
              <article key={c.clause_id + c.source} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-label-md text-ink">{c.clause_id} · {c.title}</h5>
                  <Badge tone={c.status === "review_finding" ? "warning" : "neutral"}>{c.status === "review_finding" ? "Finding to review" : "Needs verification"}</Badge>
                </div>
                <p className="mt-1 text-body-sm text-ink">{c.explanation}</p>
                <Quote className="mt-2">{c.text}</Quote>
                <p className="mt-1 text-body-sm text-muted">{c.source} · Page {c.page}</p>
                <p className="mt-1 text-body-sm text-action">{c.next_step}</p>
              </article>
            ))}
          </div>
        </Disclosure>
        <Disclosure summary={`Medical evidence compared with policy clauses · ${ai.proposals.length} AI drafts`}>
          <Notice className="mb-3">{ai.notice}</Notice>
          <div className="flex flex-col gap-3">
            {ai.proposals.map((p, i) => (
              <article key={i} className="rounded-lg border border-line p-4 text-body-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-label-md">Clause {p.clause_id} · {AI_LABELS[p.assessment] ?? "Needs verification"}</h5>
                  <Badge tone="neutral">Unconfirmed AI draft</Badge>
                </div>
                <p className="mt-1">{p.explanation}</p>
                <p className="mt-2 font-semibold">Policy evidence</p>
                <Quote>{p.policy_quote}</Quote>
                {p.evidence.map((c, j) => (
                  <div key={j} className="mt-2"><p className="font-semibold">{c.filename} · Page {c.page}</p><Quote>{c.quote}</Quote></div>
                ))}
                {p.missing_information.length > 0 && <p className="mt-2 text-warning">Still needed: {p.missing_information.join("; ")}</p>}
              </article>
            ))}
          </div>
        </Disclosure>
        <Disclosure summary="Expense coverage checks">
          <ul className="flex flex-col gap-1 text-body-sm">
            {review.expenses.map((l) => (
              <li key={l.line_no}>
                Line {l.line_no}: {l.description}: {l.status === "potentially_non_payable" ? "Potentially non-payable under the extracted terms; verify exclusions" : "Eligibility needs verification"}
              </li>
            ))}
          </ul>
        </Disclosure>
      </div>
    </Card>
  );
}

const FILE_LABEL = (name: string) => (name.startsWith("reconciliation") ? "Reconciliation report (PDF)" : name.includes("insurer") ? "Letter to insurer (PDF)" : "Letter to hospital (PDF)");

export function DownloadLinks({ caseId, files, letters, tone = "light" }: { caseId: string; files: Record<string, string>; letters: Letter[]; tone?: "light" | "dark" }) {
  const cls = tone === "dark" ? "border-white/25 bg-white/10 text-white hover:bg-white/20" : "border-action/25 bg-action-soft text-action hover:bg-container";
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(files).map(([name, url]) => (
        <a key={name} href={url} target="_blank" rel="noopener" className={cx("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-label-md", cls)}>
          <Download className="size-3.5" aria-hidden /> {FILE_LABEL(name)}
        </a>
      ))}
      {letters.map((l) => (
        <a key={l.recipient} href={`/api/cases/${encodeURIComponent(caseId)}/letters/${l.recipient}.txt`} className={cx("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-label-md", cls)}>
          <FileText className="size-3.5" aria-hidden /> Letter to {l.recipient} (text)
        </a>
      ))}
    </div>
  );
}

export function LettersPanel({ caseId, letters, files }: { caseId: string; letters: Letter[]; files: Record<string, string> }) {
  const [active, setActive] = useState(0);
  const letter = letters[active];
  const full = letter ? `To,\n${letter.to}\n\nSubject: ${letter.subject}\n\n${letter.body}` : "";
  return (
    <Card id="letters">
      <CardHeader icon={<Mail className="size-4" />} title="Ready-to-send letters & report" subtitle="Review and personalise before sending. ClaimShield never submits anything on your behalf." actions={<DownloadLinks caseId={caseId} files={files} letters={letters} />} />
      <div className="p-6">
        {letters.length === 0 ? (
          <p className="text-body-md text-muted">No dispute letter needed: nothing on this bill is worth disputing. The reconciliation report is still available above.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist">
              {letters.map((l, i) => (
                <button key={l.recipient} type="button" role="tab" aria-selected={i === active} onClick={() => setActive(i)} className={cx("rounded-lg border px-4 py-2 text-label-md", i === active ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink hover:bg-neutral-bg")}>
                  {l.recipient === "insurer" ? "To the insurer" : "To the hospital"}
                </button>
              ))}
              <CopyButton text={full} />
            </div>
            <div className="rounded-xl bg-neutral-bg p-4 md:p-8">
              <article className="mx-auto max-w-[8.5in] rounded bg-white p-8 shadow-paper">
                <p className="text-label-sm uppercase text-muted">Draft · {letter.finding_ids.length} finding{letter.finding_ids.length === 1 ? "" : "s"} cited</p>
                <pre className="reading mt-4 whitespace-pre-wrap font-serif text-[0.95rem] text-ink">{full}</pre>
              </article>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------------------- timeline

interface TimelineEvent {
  id: string;
  date: string;
  event_type: string;
  claim_status: string;
  source: string;
  notes?: string;
  required_documents?: string[];
  attachment_names?: string[];
}

interface Timeline {
  claim_status?: string | null;
  events: TimelineEvent[];
  pending_actions: { action: string; required_documents: string[] }[];
}

const EVENT_STATUS: Record<string, string> = {
  submission: "submitted",
  insurer_query: "query_pending",
  document_response: "documents_responded",
  settlement: "settled",
  rejection: "rejected",
  grievance: "grievance_open",
  closure: "closed",
};

export function TimelinePanel({ caseId }: { caseId: string }) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [rules, setRules] = useState<{ available: boolean; version?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [eventType, setEventType] = useState("submission");
  const [status, setStatus] = useState("submitted");
  const [draft, setDraft] = useState<{ subject: string; recipient: string; body: string } | null>(null);

  const load = async () => {
    const [t, r] = await Promise.all([
      getJson<Timeline>(`/api/cases/${caseId}/timeline`, "Could not load the claim timeline."),
      getJson<{ available: boolean; version?: string }>(`/api/cases/${caseId}/escalation-rules`).catch(() => ({ available: false })),
    ]);
    setTimeline(t);
    setRules(r);
  };

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      event_type: data.get("event_type"),
      date: data.get("date"),
      claim_status: data.get("claim_status"),
      source: data.get("source"),
      notes: data.get("notes"),
      required_documents: String(data.get("required_documents") || "").split(",").map((x) => x.trim()).filter(Boolean),
    };
    setBusy(true);
    setError(null);
    try {
      const result = await sendJson<Timeline>(`/api/cases/${caseId}/timeline/events`, payload, "POST", "The event could not be saved.");
      const file = data.get("attachment") as File | null;
      if (file && file.size) {
        const added = result.events.find((ev) => ev.event_type === payload.event_type && ev.date === payload.date && ev.source === payload.source);
        if (added) {
          const upload = new FormData();
          upload.append("file", file);
          await postForm(`/api/cases/${caseId}/timeline/events/${added.id}/documents`, upload, "The event was saved, but the document attachment failed.");
        }
      }
      form.reset();
      setEventType("submission");
      setStatus("submitted");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const requestDraft = async (grievance: boolean) => {
    setError(null);
    try {
      const response = await apiFetch(`/api/cases/${caseId}/timeline/draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grievance }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Could not draft letter.");
      setDraft(body);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Card id="timeline">
      <CardHeader icon={<CalendarClock className="size-4" />} title="Claim timeline & next steps" subtitle="Record claim updates and prepare a follow-up. Drafts are not submitted to an insurer or external portal." />
      <div className="flex flex-col gap-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Current claim status" value={<span className="capitalize">{humanize(timeline?.claim_status || "No status recorded")}</span>} />
          <StatCard label="Escalation rules" value={rules?.available ? `Version ${rules.version}` : "Unavailable"} />
        </div>
        <ol className="relative flex flex-col gap-3 border-l-2 border-line pl-5">
          {timeline?.events.length ? (
            timeline.events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[1.62rem] top-1 size-3 rounded-full border-2 border-white bg-action" aria-hidden />
                <p className="tnum text-label-sm uppercase text-muted">{e.date}</p>
                <p className="text-label-md capitalize text-ink">{humanize(e.event_type)}</p>
                <p className="text-body-sm text-muted">{humanize(e.claim_status)} · {e.source}</p>
                {e.notes && <p className="text-body-sm text-ink">{e.notes}</p>}
                {!!e.required_documents?.length && <p className="text-body-sm text-warning">Required: {e.required_documents.join(", ")}</p>}
                {!!e.attachment_names?.length && <p className="text-body-sm text-muted">Attached: {e.attachment_names.join(", ")}</p>}
              </li>
            ))
          ) : (
            <li className="text-body-sm text-muted">No claim events recorded yet.</li>
          )}
        </ol>
        {timeline?.pending_actions.map((a, i) => (
          <Notice key={i} tone="info"><b>{a.action}</b>{a.required_documents.length ? ` · Required documents: ${a.required_documents.join(", ")}` : ""}</Notice>
        ))}
        <form onSubmit={submit} className="grid gap-4 rounded-lg border border-line bg-subtle p-4 md:grid-cols-3">
          <Field label="Event">
            <Select name="event_type" value={eventType} onChange={(e) => { setEventType(e.target.value); if (EVENT_STATUS[e.target.value]) setStatus(EVENT_STATUS[e.target.value]); }} required>
              {Object.keys(EVENT_STATUS).map((k) => <option key={k} value={k}>{humanize(k).replace(/^./, (c) => c.toUpperCase())}</option>)}
            </Select>
          </Field>
          <Field label="Date"><Input name="date" type="date" required /></Field>
          <Field label="Claim status">
            <Select name="claim_status" value={status} onChange={(e) => setStatus(e.target.value)} required>
              {["submitted", "query_pending", "documents_responded", "settled", "rejected", "grievance_open", "grievance_resolved", "closed"].map((s) => (
                <option key={s} value={s}>{humanize(s).replace(/^./, (c) => c.toUpperCase())}</option>
              ))}
            </Select>
          </Field>
          <Field label="Source"><Input name="source" required maxLength={160} placeholder="e.g. Insurer email" /></Field>
          <Field label="Notes"><Input name="notes" maxLength={4000} /></Field>
          <Field label="Required supporting documents"><Input name="required_documents" placeholder="Comma separated" /></Field>
          <Field label="Attach PDF (optional)" className="md:col-span-2"><Input name="attachment" type="file" accept="application/pdf" /></Field>
          <div className="flex flex-wrap items-end gap-2">
            <Button type="submit" busy={busy}>Add event</Button>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <Button variant="secondary" onClick={() => requestDraft(false)}><Send className="size-3.5" aria-hidden /> Draft follow-up</Button>
            <Button variant="secondary" onClick={() => requestDraft(true)}><Mail className="size-3.5" aria-hidden /> Draft grievance letter</Button>
          </div>
        </form>
        <ErrorBanner message={error} />
        {draft && (
          <div className="rounded-xl bg-neutral-bg p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-label-md text-ink">{draft.subject}</h4>
              <CopyButton text={`To: ${draft.recipient}\n\n${draft.body}`} />
            </div>
            <pre className="reading whitespace-pre-wrap rounded bg-white p-6 font-serif text-[0.95rem] shadow-paper">{`To: ${draft.recipient}\n\n${draft.body}\n\nStatus: Draft only; not submitted.`}</pre>
          </div>
        )}
      </div>
    </Card>
  );
}
