import { useState, type FormEvent } from "react";
import { Button, Field, Input, Notice, Select, Verdict } from "../../components/ui";
import { FilePicker } from "../../components/files";
import { ClauseEvidence, Section, ToolPage } from "../../components/tool";
import { postForm } from "../../lib/api";
import { humanize } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { useUploads } from "../../state/uploads";

interface Result {
  notice: string;
  uncertain: boolean;
  uncertainty?: string;
  language: string;
  explanation: string;
  method: string;
  passages: { clause_id: string; title: string; text: string; page: number; source: string }[];
}

export default function PolicyExplainer() {
  const uploads = useUploads();
  const [policy, setPolicy] = useState<File[]>([]);
  const { data, error, busy, run } = useAsync<Result>();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.append("policy", policy[0]);
    run(() => postForm<Result>("/api/policy-explainer", form, "Could not explain this policy document."));
  };

  return (
    <ToolPage
      eyebrow="Claim tools · policy assistant"
      title="Multilingual policy explainer"
      description="Get a plain-language explanation grounded in retrieved policy clauses. The original policy wording remains the contract."
      error={error}
      form={
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <FilePicker label="Policy document (PDF)" files={policy} onFiles={setPolicy} required reuse={uploads.mainPolicyFile ? [uploads.mainPolicyFile] : []} reuseLabel="Use the policy from your audit" />
          <Field label="Explanation language">
            <Select name="language" defaultValue="en">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="kn">Kannada</option>
            </Select>
          </Field>
          <Field label="What would you like explained?" className="md:col-span-2">
            <Input name="question" maxLength={500} required placeholder="For example: What co-payment applies?" />
          </Field>
          <div><Button type="submit" busy={busy} disabled={!policy.length}>Explain policy clause</Button></div>
        </form>
      }
      result={
        data && (
          <>
            <Notice>{data.notice}</Notice>
            {data.uncertain && <Verdict tone="fail">Uncertainty: {data.uncertainty || "The source wording needs confirmation."}</Verdict>}
            <Section title={`Plain-language explanation · ${data.language.toUpperCase()}`}>
              <p className="reading text-body-lg text-ink" lang={data.language}>{data.explanation}</p>
              <p className="mt-2 text-body-sm text-muted">Method: {humanize(data.method)}</p>
            </Section>
            <Section title="Original policy clauses for comparison">
              <ClauseEvidence items={data.passages.map((p) => ({ ...p, quote: p.text }))} />
            </Section>
          </>
        )
      }
    />
  );
}
