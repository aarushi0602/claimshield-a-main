import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { Badge, Button, Field, Input, Notice, Quote, Select, StatCard, Table, type Tone } from "../../components/ui";
import { FilePicker } from "../../components/files";
import { Section, ToolPage } from "../../components/tool";
import { downloadText, postForm } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import type { DocumentCheck as Result } from "../../lib/types";
import { useUploads } from "../../state/uploads";

const STATUS: Record<string, [string, Tone]> = {
  complete: ["Complete", "success"],
  missing: ["Missing", "danger"],
  uncertain: ["Uncertain", "warning"],
  detected: ["Detected", "info"],
  duplicate: ["Duplicate", "neutral"],
};

export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = STATUS[status] ?? [status, "neutral" as Tone];
  return <Badge tone={tone}>{label}</Badge>;
}

export default function DocumentCheck() {
  const uploads = useUploads();
  const [files, setFiles] = useState<File[]>([]);
  const { data, error, busy, run } = useAsync<Result>();
  const reuse = [...uploads.medical, ...uploads.insurance];

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    files.forEach((f) => form.append("files", f));
    run(() => postForm<Result>("/api/document-check", form, "Check the uploaded PDFs and try again."));
  };

  return (
    <ToolPage
      eyebrow="Claim tools · document checker"
      title="Smart claim document checker"
      description="Upload claim documents together. Document types are inferred from the extracted PDF text; filenames are shown only for reference."
      error={error}
      form={
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <FilePicker label="Claim documents (PDFs)" files={files} onFiles={setFiles} multiple required reuse={reuse} />
          </div>
          <Field label="Claim type">
            <Select name="claim_type" defaultValue={uploads.claimType}>
              <option value="reimbursement">Reimbursement</option>
              <option value="cashless">Cashless</option>
              <option value="day_care">Day care</option>
              <option value="default">General / unsure</option>
            </Select>
          </Field>
          <Field label="Insurer name (optional)" hint="Only used for configured insurer requirements">
            <Input name="insurer" maxLength={120} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" busy={busy} disabled={!files.length}>Check documents</Button>
          </div>
        </form>
      }
      result={
        data && (
          <>
            <Notice>{data.generic_recommendations_notice}</Notice>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(data.summary).map(([k, v]) => <StatCard key={k} label={k} value={v} />)}
            </div>
            <Section
              title="Checklist"
              actions={<Button variant="secondary" size="sm" onClick={() => downloadText("claimshield-document-checklist.csv", data.export_csv, "text/csv;charset=utf-8")}><Download className="size-3.5" aria-hidden /> Export checklist (CSV)</Button>}
            >
              <Table head={["Requirement", "Status", "Source", "Notes"]}>
                {data.checklist.map((item, i) => (
                  <tr key={i} className="align-top">
                    <td className="px-4 py-2.5"><p className="font-medium">{item.label}</p><p className="text-label-sm uppercase text-muted">{item.requirement_kind}</p></td>
                    <td className="px-4 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-2.5 text-body-sm">{item.source}</td>
                    <td className="px-4 py-2.5 text-body-sm">{item.note}{item.fields_not_detected?.length ? <p className="text-warning">Not detected: {item.fields_not_detected.join(", ")}</p> : null}</td>
                  </tr>
                ))}
              </Table>
            </Section>
            <Section title="Documents detected">
              <div className="grid gap-3 md:grid-cols-2">
                {data.documents.map((doc, i) => (
                  <article key={i} className="rounded-lg border border-line p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div><h4 className="text-label-md text-ink">{doc.type_label}</h4><p className="text-body-sm text-muted">{doc.filename} · {doc.text_characters} readable characters</p></div>
                      <StatusBadge status={doc.status} />
                    </div>
                    <p className="mt-2 text-body-sm">{doc.reason}</p>
                    {doc.fields_detected.length > 0 && <p className="mt-1 text-body-sm"><b>Detected fields:</b> {doc.fields_detected.join(", ")}</p>}
                    {doc.fields_not_detected.length > 0 && <p className="mt-1 text-body-sm text-warning"><b>Not detected, verify the original:</b> {doc.fields_not_detected.join(", ")}</p>}
                    {doc.evidence_excerpt && <Quote className="mt-2">{doc.evidence_excerpt}</Quote>}
                  </article>
                ))}
              </div>
            </Section>
          </>
        )
      }
    />
  );
}
