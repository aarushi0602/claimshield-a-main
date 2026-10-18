import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Badge, Button, Card, Disclosure, ErrorBanner, Field, Input, Notice, PageHeader, Pill, Quote, Select, Textarea } from "../../components/ui";
import { FilePicker } from "../../components/files";
import { getJson, postForm, sendJson } from "../../lib/api";
import { humanize } from "../../lib/format";

interface RegDocument {
  document_id: string;
  title: string;
  circular_number: string;
  publication_date?: string | null;
  effective_date?: string | null;
  human_review_status: string;
  ingestion_note: string;
  sha256?: string | null;
  retrieval_date?: string | null;
  last_verification_date?: string | null;
  reviewed_by?: string | null;
  official_source_url: string;
}

interface Rule {
  rule_id: string;
  rule_title: string;
  human_review_status: string;
  enforcement_enabled: boolean;
  source_citation: string;
  source_page?: number | null;
  source_paragraph?: string | null;
  source_quote: string;
  source_document_id: string;
  effective_date?: string | null;
  expiry_date?: string | null;
  classification: string;
}

interface Applicability {
  status: string;
  assessment_kind: string;
  reasons: string[];
  source_citation: string;
  source_page?: number | null;
  source_document_id: string;
  source_sha256?: string | null;
}

interface Preview {
  title: string;
  page_count: number;
  bytes: number;
  sha256: string;
  notice: string;
  provenance_status: string;
  pages: string[];
}

function DocCard({ d, onReviewed, onError, onEvidence }: { d: RegDocument; onReviewed: () => void; onError: (m: string) => void; onEvidence: (id: string, page?: string) => void }) {
  const [current, setCurrent] = useState(false);
  const [explanation, setExplanation] = useState("");
  const approve = async () => {
    try {
      await sendJson(`/api/admin/regulatory/documents/${encodeURIComponent(d.document_id)}/review`, { human_review_status: "approved", currentness_checked: current, reviewer_explanation: explanation.trim() }, "POST", "Document review failed.");
      onReviewed();
    } catch (e) {
      onError((e as Error).message);
    }
  };
  return (
    <article className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-label-md text-ink">{d.title}</h3>
          <p className="text-body-sm text-muted">{d.circular_number} · Published {d.publication_date || "date unavailable"} · Effective {d.effective_date || "not established"}</p>
        </div>
        <Badge tone={d.human_review_status === "approved" ? "success" : "warning"}>{humanize(d.human_review_status)}</Badge>
      </div>
      <p className="mt-2 text-body-sm">{d.ingestion_note}</p>
      <p className="mt-1 break-all text-body-sm text-muted">SHA-256: {d.sha256 || "not imported"} · Retrieved {d.retrieval_date || "not recorded"} · Last currentness review {d.last_verification_date || "not recorded"} · Reviewed by {d.reviewed_by || "nobody"}</p>
      <p className="mt-1 text-body-sm">
        <a href={d.official_source_url} target="_blank" rel="noopener" className="text-action hover:underline">Official IRDAI listing</a>
        {d.sha256 && <> · <a href={`/api/regulatory/documents/${encodeURIComponent(d.document_id)}/pdf`} target="_blank" rel="noopener" className="text-action hover:underline">Original PDF</a></>}
      </p>
      {d.sha256 && (
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-body-sm"><input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} className="accent-action" /> I checked subsequent amendments for this document</label>
          <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Record source and currentness review" aria-label="Review explanation" />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={approve}>Approve document reference</Button>
            <Button variant="secondary" size="sm" onClick={() => onEvidence(d.document_id)}>Inspect extracted text</Button>
          </div>
        </div>
      )}
    </article>
  );
}

function RuleCard({ r, onReviewed, onError, onEvidence }: { r: Rule; onReviewed: () => void; onError: (m: string) => void; onEvidence: (id: string, page?: string) => void }) {
  const [explanation, setExplanation] = useState("");
  const [enable, setEnable] = useState(false);
  const review = async (status: "approved" | "rejected") => {
    try {
      await sendJson(`/api/admin/regulatory/rules/${encodeURIComponent(r.rule_id)}/review`, { human_review_status: status, enforcement_enabled: status === "approved" && enable, reviewer_explanation: explanation.trim() }, "POST", "Rule review failed.");
      onReviewed();
    } catch (e) {
      onError((e as Error).message);
    }
  };
  return (
    <article className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-label-md text-ink">{r.rule_title}</h3>
        <Badge tone={r.human_review_status === "approved" ? "success" : "warning"}>{humanize(r.human_review_status)}{r.enforcement_enabled ? " · enabled" : " · inactive"}</Badge>
      </div>
      <p className="mt-1 text-body-sm text-muted">{r.source_citation}{r.source_page ? ` · page ${r.source_page}` : " · page unavailable"}{r.source_paragraph ? ` · ${r.source_paragraph}` : ""}</p>
      <Quote className="mt-2">{r.source_quote}</Quote>
      <p className="mt-1 text-body-sm text-muted">Effective {r.effective_date || "unknown"} · Expires {r.expiry_date || "not recorded"} · {humanize(r.classification)}</p>
      <Textarea rows={2} className="mt-2" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Record the human review decision" aria-label="Reviewer explanation" />
      <label className="mt-2 flex items-center gap-2 text-body-sm"><input type="checkbox" checked={enable} onChange={(e) => setEnable(e.target.checked)} className="accent-action" /> Enable reviewed rule for applicability checks</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => review("approved")}>Approve</Button>
        <Button variant="secondary" size="sm" onClick={() => review("rejected")}>Reject</Button>
        <Button variant="secondary" size="sm" onClick={() => onEvidence(r.source_document_id, r.source_page ? String(r.source_page) : undefined)}>Inspect source evidence</Button>
      </div>
    </article>
  );
}

export default function Regulatory() {
  const [docs, setDocs] = useState<RegDocument[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [notice, setNotice] = useState("Unreviewed candidates are not legally authoritative. Currentness must be checked before approval.");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Applicability | null>(null);
  const [ruleId, setRuleId] = useState("");
  const [pdf, setPdf] = useState<File[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [adminResult, setAdminResult] = useState<string | null>(null);

  const load = useCallback(async (q = query) => {
    setError(null);
    try {
      const [d, r] = await Promise.all([
        getJson<{ documents: RegDocument[] }>("/api/regulatory/documents"),
        getJson<{ rules: Rule[]; notice: string }>(`/api/regulatory/rules/search?q=${encodeURIComponent(q.trim())}`),
      ]);
      setDocs(d.documents);
      setRules(r.rules);
      setNotice(r.notice);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [query]);

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inspect = async (id: string, page?: string) => {
    try {
      const body = await getJson<{ page?: number; text?: string; pages?: number; sha256?: string }>(`/api/regulatory/documents/${encodeURIComponent(id)}/evidence${page ? `?page=${encodeURIComponent(page)}` : ""}`, "Source evidence unavailable.");
      setEvidence(page ? `Page ${body.page}\n\n${body.text}` : `${body.pages} extracted pages · SHA-256 ${body.sha256}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const evaluate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ruleId) return;
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(["insurance_category", "event_date", "claim_context", "policy_type"].map((n) => [n, f.get(n) || null]));
    try {
      setEvaluation(await sendJson<Applicability>(`/api/regulatory/rules/${encodeURIComponent(ruleId)}/applicability`, body, "POST", "Applicability check failed."));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const ingestForm = () => {
    const form = new FormData(document.getElementById("regulatory-ingest-form") as HTMLFormElement);
    if (pdf[0]) form.set("pdf", pdf[0]);
    return form;
  };

  const doPreview = async () => {
    setPreview(null);
    setError(null);
    try {
      setPreview(await postForm<Preview>("/api/admin/regulatory/documents/preview", ingestForm(), "PDF validation failed."));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const ingest = async (e: FormEvent) => {
    e.preventDefault();
    if (!preview) {
      setError("Validate and preview this file before storing it.");
      return;
    }
    try {
      const body = await postForm<{ sha256: string }>("/api/admin/regulatory/documents/ingest", ingestForm(), "Document ingestion failed.");
      if (body.sha256 !== preview.sha256) throw new Error("Stored file differs from the previewed PDF. It remains unapproved; reload and validate the selected file again.");
      setAdminResult(`Stored source SHA-256 ${body.sha256}; review is required before use.`);
      setPreview(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const createCandidate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const split = (n: string) => String(f.get(n) || "").split(",").map((v) => v.trim()).filter(Boolean);
    const body = {
      rule_id: f.get("rule_id"), rule_title: f.get("rule_title"), source_document_id: f.get("source_document_id"), source_citation: f.get("source_citation"),
      source_page: Number(f.get("source_page")), source_paragraph: f.get("source_paragraph") || null, source_quote: f.get("source_quote"), effective_date: f.get("effective_date") || null,
      applicability: { insurance_categories: split("insurance_categories"), claim_contexts: split("claim_contexts"), policy_types: split("policy_types") },
      human_review_status: "pending_human_review", enforcement_enabled: false,
    };
    try {
      await sendJson("/api/admin/regulatory/rules", body, "POST", "Could not save candidate rule.");
      setAdminResult("Saved as an inactive candidate. Human approval is required.");
      form.reset();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const docOptions = docs.map((d) => <option key={d.document_id} value={d.document_id}>{d.title}</option>);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Pill>Professional workspace</Pill>}
        title="IRDAI regulatory reference"
        description="Source-bound reference material and rule applicability. Applicability is not a finding that an insurer violated a rule."
        actions={<Button variant="secondary" onClick={() => load()}><RefreshCw className="size-4" aria-hidden /> Refresh reference</Button>}
      />
      <Notice tone="info">{notice}</Notice>
      <ErrorBanner message={error} />
      {evidence && (
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-label-md">Source evidence</h2><Button variant="ghost" size="sm" onClick={() => setEvidence(null)}>Close</Button></div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-subtle p-3 text-body-sm">{evidence}</pre>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-3 text-headline-sm text-ink">Regulatory documents</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {docs.map((d) => <DocCard key={d.document_id} d={d} onReviewed={() => load()} onError={setError} onEvidence={inspect} />)}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-headline-sm text-ink">Search reviewed rules and candidates</h2>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="mb-4 flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} maxLength={160} placeholder="Search title or exact rule text" />
          <Button type="submit" variant="secondary"><Search className="size-4" aria-hidden /> Search</Button>
        </form>
        <div className="flex flex-col gap-3">
          {rules.length ? rules.map((r) => <RuleCard key={r.rule_id} r={r} onReviewed={() => load()} onError={setError} onEvidence={inspect} />) : (
            <p className="text-body-sm text-muted">No regulatory rules are registered. Documents remain metadata-only until an approved PDF is ingested and an exact quotation is reviewed.</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-headline-sm text-ink">Check rule applicability</h2>
        <form onSubmit={evaluate} className="grid gap-4 md:grid-cols-3">
          <Field label="Rule">
            <Select value={ruleId} onChange={(e) => setRuleId(e.target.value)} required>
              <option value="">Select a rule</option>
              {rules.map((r) => <option key={r.rule_id} value={r.rule_id}>{r.rule_title} · {humanize(r.human_review_status)}</option>)}
            </Select>
          </Field>
          <Field label="Insurance category"><Input name="insurance_category" placeholder="health" /></Field>
          <Field label="Relevant event date"><Input name="event_date" type="date" /></Field>
          <Field label="Claim context"><Input name="claim_context" placeholder="cashless, reimbursement, claim decision" /></Field>
          <Field label="Policy type"><Input name="policy_type" placeholder="individual, group" /></Field>
          <div className="flex items-end"><Button type="submit">Evaluate applicability</Button></div>
        </form>
        {evaluation && (
          <Notice className="mt-4">
            <b>{evaluation.status}</b> · {humanize(evaluation.assessment_kind)}
            <p className="mt-1">{evaluation.reasons.join(" ")}</p>
            <p className="mt-1 break-all">{evaluation.source_citation} · page {evaluation.source_page || "unavailable"} · {evaluation.source_document_id} · SHA-256 {evaluation.source_sha256 || "unavailable"}</p>
          </Notice>
        )}
      </Card>

      <Disclosure summary="Administrator controls">
        <p className="mb-4 text-body-sm text-muted">
          These requests require an explicitly configured regulatory administrator. Uploads stay pending until a human confirms source authenticity, exact wording, applicability and currentness. SHA-256 identifies the bytes; it does not authenticate IRDAI publication.
        </p>
        <form id="regulatory-ingest-form" onSubmit={ingest} className="grid gap-4 md:grid-cols-3">
          <Field label="Allowlisted document"><Select name="document_id" required>{docOptions}</Select></Field>
          <Field label="Official IRDAI listing URL"><Input name="source_url" required defaultValue="https://irdai.gov.in/circulars?filterDepartment=HLT&filtersApplied=true" /></Field>
          <FilePicker label="Original PDF" files={pdf} onFiles={(f) => { setPdf(f); setPreview(null); }} required />
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <Button variant="secondary" onClick={doPreview} disabled={!pdf.length}>Validate and preview pages</Button>
            <Button type="submit" variant="secondary" disabled={!preview}>Store reviewed source</Button>
          </div>
        </form>
        {preview && (
          <div className="mt-3 rounded-lg border border-line p-4 text-body-sm">
            <p className="font-semibold">{preview.title}</p>
            <p className="break-all">{preview.page_count} pages · {preview.bytes} bytes · SHA-256 {preview.sha256}</p>
            <p className="text-muted">{preview.notice} Provenance: {preview.provenance_status}.</p>
            {preview.pages.map((p, i) => (
              <details key={i} className="mt-1"><summary className="text-action">Page {i + 1}</summary><pre className="whitespace-pre-wrap text-[0.75rem]">{p || "[No text extracted]"}</pre></details>
            ))}
          </div>
        )}
        <form onSubmit={createCandidate} className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="Rule ID"><Input name="rule_id" required /></Field>
          <Field label="Rule title"><Input name="rule_title" required /></Field>
          <Field label="Source document"><Select name="source_document_id" required>{docOptions}</Select></Field>
          <Field label="Exact source citation"><Input name="source_citation" required /></Field>
          <Field label="Source page"><Input name="source_page" type="number" min="1" required /></Field>
          <Field label="Source paragraph / clause"><Input name="source_paragraph" /></Field>
          <Field label="Exact quoted text" className="md:col-span-3"><Textarea name="source_quote" required rows={3} /></Field>
          <Field label="Effective date"><Input name="effective_date" type="date" /></Field>
          <Field label="Insurance categories (comma separated)"><Input name="insurance_categories" /></Field>
          <Field label="Claim contexts (comma separated)"><Input name="claim_contexts" /></Field>
          <Field label="Policy types (comma separated)"><Input name="policy_types" /></Field>
          <div className="flex items-end"><Button type="submit" variant="secondary">Save unreviewed candidate</Button></div>
        </form>
        {adminResult && <Notice className="mt-3">{adminResult}</Notice>}
      </Disclosure>
    </div>
  );
}
