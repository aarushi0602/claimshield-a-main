import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, CopyButton, Textarea, Notice, type Tone } from "../../components/ui";
import { FilePicker } from "../../components/files";
import { BulletList, ClauseEvidence, Section, ToolPage } from "../../components/tool";
import { postForm } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { useUploads } from "../../state/uploads";

interface Reason {
  id: string;
  reason: string | null;
  classification: string;
  explanation: string;
  policy_evidence: { clause_id: string; title: string; quote: string; source: string; page?: number }[];
}

interface Result {
  disclaimer: string;
  reasons: Reason[];
  document_references?: string[];
  requested_documents: string[];
  additional_documents_to_confirm: string[];
  appeal_draft: string;
}

export default function Rejection() {
  const uploads = useUploads();
  const [letter, setLetter] = useState<File[]>([]);
  const [policy, setPolicy] = useState<File[]>([]);
  const [draft, setDraft] = useState("");
  const { data, error, busy, run } = useAsync<Result>();
  useEffect(() => setDraft(data?.appeal_draft ?? ""), [data]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const form = new FormData();
    form.append("rejection_letter", letter[0]);
    form.append("policy", policy[0]);
    run(() => postForm<Result>("/api/rejection-analysis", form, "Check both PDF files and try again."));
  };

  return (
    <ToolPage
      eyebrow="Claim tools · denial support"
      title="Claim rejection analysis"
      description="Compare the reasons in a rejection notice with your policy wording. Results are evidence-based and do not decide whether a rejection is lawful."
      error={error}
      form={
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <FilePicker label="Insurance rejection letter (PDF)" files={letter} onFiles={setLetter} required />
          <FilePicker label="Insurance policy (PDF)" files={policy} onFiles={setPolicy} required reuse={uploads.mainPolicyFile ? [uploads.mainPolicyFile] : []} reuseLabel="Use the policy from your audit" />
          <Button type="submit" busy={busy} disabled={!letter.length || !policy.length}>Analyze rejection</Button>
        </form>
      }
      result={
        data && (
          <>
            <Notice>{data.disclaimer}</Notice>
            {data.reasons.map((r) => {
              const tone: Tone = r.classification.startsWith("Potentially") ? "warning" : r.classification.startsWith("Supported") ? "success" : "neutral";
              return (
                <Section key={r.id} title={r.reason ? `Reason ${r.id}: ${r.reason}` : "No rejection reason found"} actions={<Badge tone={tone}>{r.classification}</Badge>}>
                  <p className="text-body-md text-ink">{r.explanation}</p>
                  <h4 className="mb-2 mt-4 text-label-md text-ink">Policy evidence</h4>
                  <ClauseEvidence items={r.policy_evidence} />
                </Section>
              );
            })}
            {!!data.document_references?.length && <Section title="Document references in the notice"><BulletList items={data.document_references} /></Section>}
            {data.requested_documents.length > 0 && <Section title="Documents the rejection notice asks you to provide"><BulletList items={data.requested_documents} /></Section>}
            {data.additional_documents_to_confirm.length > 0 && <Section title="Documents or clarification to confirm"><BulletList items={data.additional_documents_to_confirm} /></Section>}
            <Section title="Appeal or clarification draft · review before sending" actions={<CopyButton text={draft} label="Copy draft" />}>
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={18} className="font-serif" />
            </Section>
          </>
        )
      }
    />
  );
}
