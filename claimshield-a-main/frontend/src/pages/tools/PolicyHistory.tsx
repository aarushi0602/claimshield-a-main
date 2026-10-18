import { useState, type FormEvent } from "react";
import { Button, Field, Input, Notice, Quote, Select, StatCard, Verdict } from "../../components/ui";
import { FilePicker } from "../../components/files";
import { BulletList, Section, ToolPage } from "../../components/tool";
import { postForm } from "../../lib/api";
import { humanize } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { useUploads } from "../../state/uploads";

const DOC_TYPES = [
  ["current_policy", "Current policy wording / schedule"],
  ["renewal", "Renewal schedule / notice"],
  ["endorsement", "Endorsement"],
  ["prior_policy", "Prior policy document"],
  ["portability_certificate", "Portability / continuity certificate"],
];

interface Result {
  notice: string;
  treatment_date: string;
  applicable_policy_version: string | null;
  applicable_policy_dates?: { start?: string; expiry?: string };
  continuity_status: string;
  policy_versions: { document_type: string; filename: string; version_id: string; insurer?: string; plan_name?: string; policy_number?: string; policy_start_date?: string; policy_expiry_date?: string; renewal_date?: string; sha256: string; endorsements: string[] }[];
  waiting_periods: { condition: string; duration: string; status: string; clause_id: string; version_id: string; months_since_current_start: number | null; text: string }[];
  missing_historical_documents: string[];
  conflicts: { message: string }[];
  warnings: string[];
}

export default function PolicyHistory() {
  const uploads = useUploads();
  const [files, setFiles] = useState<File[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const { data, error, busy, run } = useAsync<Result>();

  const chooseFiles = (f: File[]) => {
    setFiles(f);
    setTypes(f.map(() => "current_policy"));
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const metadata = { treatment: d.get("treatment"), treatment_date: d.get("treatment_date"), continuity_status: d.get("continuity_status"), documents: types.map((t) => ({ document_type: t })) };
    const payload = new FormData();
    payload.append("metadata", JSON.stringify(metadata));
    files.forEach((f) => payload.append("documents", f));
    run(() => postForm<Result>("/api/policy-history/check", payload, "Check the policy PDFs and treatment date."));
  };

  return (
    <ToolPage
      eyebrow="Claim tools · policy history"
      title="Policy version & waiting-period checker"
      description="Upload policy schedules, renewals, endorsements, prior policy or portability documents. Renewal dates alone do not establish continuity."
      error={error}
      form={
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Treatment or condition"><Input name="treatment" maxLength={160} required /></Field>
            <Field label="Treatment date"><Input name="treatment_date" type="date" required /></Field>
            <Field label="Continuity evidence status">
              <Select name="continuity_status"><option value="unknown">Unknown / not verified</option><option value="confirmed_with_documents">Confirmed with supporting documents</option><option value="not_confirmed">Not confirmed</option></Select>
            </Field>
            <div className="md:col-span-3"><FilePicker label="Policy documents (PDFs)" files={files} onFiles={chooseFiles} multiple required reuse={uploads.insurance} reuseLabel="Use the insurance documents from your audit" /></div>
          </div>
          {files.length > 0 && (
            <div className="grid gap-3 rounded-lg border border-line bg-subtle p-4 md:grid-cols-2">
              {files.map((f, i) => (
                <Field key={f.name + i} label={f.name}>
                  <Select value={types[i]} onChange={(e) => setTypes((t) => t.map((x, j) => (j === i ? e.target.value : x)))} required>
                    {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
              ))}
            </div>
          )}
          <div><Button type="submit" busy={busy} disabled={!files.length}>Check policy history</Button></div>
        </form>
      }
      result={
        data && (
          <>
            <Notice>{data.notice}</Notice>
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard label="Applicable document version" value={<span className="text-headline-sm">{data.applicable_policy_version || "Unresolved"}</span>} />
              <StatCard label="Dates used" value={<span className="text-headline-sm">{data.applicable_policy_dates?.start || "Unknown"} → {data.applicable_policy_dates?.expiry || "Unknown"}</span>} />
              <StatCard label="Continuity input" value={<span className="text-headline-sm capitalize">{humanize(data.continuity_status)}</span>} />
            </div>
            <Section title="Policy information & document versions">
              <div className="grid gap-3 md:grid-cols-2">
                {data.policy_versions.map((v) => (
                  <article key={v.version_id} className="rounded-lg border border-line p-4 text-body-sm">
                    <p className="text-label-sm uppercase text-action">{humanize(v.document_type)}</p>
                    <p className="font-semibold text-ink">{v.filename}</p>
                    <p>Version ID: <code className="font-mono">{v.version_id}</code></p>
                    <p>Insurer / plan: {v.insurer || "Not extracted"} · {v.plan_name || "Not extracted"}</p>
                    <p>Policy number: {v.policy_number || "Not extracted"}</p>
                    <p>Valid: {v.policy_start_date || "Unknown"} to {v.policy_expiry_date || "Unknown"} · Renewal: {v.renewal_date || "Not found"}</p>
                    <p className="break-all text-muted">SHA-256: <code>{v.sha256}</code></p>
                    {v.endorsements.length > 0 && <p>Endorsements: {v.endorsements.join(" · ")}</p>}
                  </article>
                ))}
              </div>
            </Section>
            <Section title="Potentially relevant waiting periods">
              {data.waiting_periods.length ? (
                <div className="flex flex-col gap-3">
                  {data.waiting_periods.map((w, i) => (
                    <div key={i}>
                      <p className="text-label-md">{w.condition} · {w.duration} · <span className="capitalize">{humanize(w.status)}</span></p>
                      <p className="text-body-sm text-muted">Clause {w.clause_id} ({w.version_id}) · treatment date {data.treatment_date} · elapsed from selected start {w.months_since_current_start == null ? "unknown" : `${w.months_since_current_start} months`}</p>
                      <Quote className="mt-1">{w.text}</Quote>
                    </div>
                  ))}
                </div>
              ) : <p className="text-body-sm text-muted">No relevant waiting period was found in the parsed clauses.</p>}
            </Section>
            <Section title="Missing historical documents">{data.missing_historical_documents.length ? <BulletList items={data.missing_historical_documents} /> : <Notice>No continuity documents are missing from the supplied set.</Notice>}</Section>
            <Section title="Document conflicts">
              {data.conflicts.length ? <div className="flex flex-col gap-2">{data.conflicts.map((c, i) => <Verdict key={i} tone="fail">{c.message}</Verdict>)}</div> : <Notice>No conflicting identifiers or same-type start dates detected in the uploaded documents.</Notice>}
            </Section>
            {data.warnings.length > 0 && <Section title="Review notes"><div className="flex flex-col gap-2">{data.warnings.map((w, i) => <Notice key={i}>{w}</Notice>)}</div></Section>}
          </>
        )
      }
    />
  );
}
