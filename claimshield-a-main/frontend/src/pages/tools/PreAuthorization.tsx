import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { Button, ErrorBanner, Field, Input, Notice, Select, Verdict, cx } from "../../components/ui";
import { FilePicker } from "../../components/files";
import { ClauseEvidence, Section, ToolPage } from "../../components/tool";
import { downloadText, postForm, sendJson } from "../../lib/api";
import { humanize } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { useUploads } from "../../state/uploads";

interface Result {
  preauthorization_id: string;
  documents_complete: boolean;
  missing_required_documents: string[];
  document_checklist: { label: string; provided: boolean; required: boolean }[];
  warnings: { kind: string; message: string; status?: string }[];
  coverage_evidence: { clause_id: string; title: string; text: string; page: number }[];
  summary: string;
  authorization_status: string;
  approval_disclaimer: string;
}

const DOC_TYPES = [
  ["hospital_estimate", "Hospital cost estimate"],
  ["doctor_advice", "Doctor advice / admission recommendation"],
  ["policy_schedule", "Policy schedule or e-card"],
  ["patient_id", "Patient identity document"],
  ["investigation_reports", "Relevant investigation reports"],
];

const STATUSES = [["pending", "Pending"], ["approved", "Approved"], ["partially_approved", "Partially approved"], ["denied", "Denied"], ["more_information_requested", "More information requested"]];

const FIELDS = ["patient_name", "treatment", "estimated_cost", "cost_notes", "hospital_name", "hospital_address", "hospital_contact", "network_status", "insurer_name", "tpa_name", "policy_number", "plan_name", "policy_start", "policy_end"];

export default function PreAuthorization() {
  const uploads = useUploads();
  const [policy, setPolicy] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);
  const [status, setStatus] = useState("pending");
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { data, error, busy, run } = useAsync<Result>();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const intake: Record<string, unknown> = Object.fromEntries(FIELDS.map((k) => [k, fields.get(k)]));
    intake.estimated_cost = Number(intake.estimated_cost);
    intake.patient_consent = fields.get("patient_consent") === "on";
    intake.document_types = fields.getAll("document_types");
    for (const key of ["policy_start", "policy_end"]) if (!intake[key]) intake[key] = null;
    const payload = new FormData();
    payload.append("intake", JSON.stringify(intake));
    if (policy[0]) payload.append("policy", policy[0]);
    docs.forEach((d) => payload.append("documents", d));
    setStatusLabel(null);
    run(() => postForm<Result>("/api/preauthorizations", payload, "Check consent and request details."));
  };

  const saveStatus = async () => {
    if (!data) return;
    setSaving(true);
    setStatusError(null);
    try {
      const body = await sendJson<{ authorization_status: string }>(`/api/preauthorizations/${data.preauthorization_id}/status`, { status }, "PATCH", "Could not save status.");
      setStatusLabel(`${body.authorization_status} · manually entered, not verified`);
    } catch (e) {
      setStatusError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToolPage
      eyebrow="Claim tools · pre-authorization"
      title="Cashless pre-authorization preparation"
      description="Prepare information and documents for insurer review. ClaimShield cannot grant authorization and does not contact an insurer or hospital."
      error={error}
      form={
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Patient name"><Input name="patient_name" maxLength={160} required /></Field>
            <Field label="Treatment"><Input name="treatment" maxLength={160} required /></Field>
            <Field label="Estimated treatment cost (₹)"><Input name="estimated_cost" type="number" min="0.01" max="100000000" step="0.01" required /></Field>
            <Field label="Cost notes (optional)"><Input name="cost_notes" maxLength={1000} /></Field>
            <Field label="Hospital name"><Input name="hospital_name" maxLength={180} required /></Field>
            <Field label="Hospital address"><Input name="hospital_address" maxLength={500} required /></Field>
            <Field label="Hospital contact (optional)"><Input name="hospital_contact" maxLength={120} /></Field>
            <Field label="Network status">
              <Select name="network_status"><option value="unknown">Not confirmed</option><option value="confirmed_network">Confirmed network</option><option value="confirmed_non_network">Confirmed non-network</option></Select>
            </Field>
            <Field label="Insurer name"><Input name="insurer_name" maxLength={160} required /></Field>
            <Field label="TPA (optional)"><Input name="tpa_name" maxLength={160} /></Field>
            <Field label="Policy number"><Input name="policy_number" maxLength={120} required /></Field>
            <Field label="Plan name (optional)"><Input name="plan_name" maxLength={160} /></Field>
            <Field label="Policy start date"><Input name="policy_start" type="date" /></Field>
            <Field label="Policy end date"><Input name="policy_end" type="date" /></Field>
            <FilePicker label="Policy wording PDF (optional)" files={policy} onFiles={setPolicy} reuse={uploads.mainPolicyFile ? [uploads.mainPolicyFile] : []} reuseLabel="Use the policy from your audit" />
            <FilePicker label="Supporting documents (PDFs)" files={docs} onFiles={setDocs} multiple />
          </div>
          <fieldset className="rounded-lg border border-line p-4">
            <legend className="px-1 text-label-md text-ink">Documents available for this request</legend>
            <div className="grid gap-2 md:grid-cols-2">
              {DOC_TYPES.map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-body-md"><input type="checkbox" name="document_types" value={v} className="size-4 accent-action" /> {l}</label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-2 text-body-md">
            <input name="patient_consent" type="checkbox" required className="mt-0.5 size-4 accent-action" />
            I confirm the patient has consented to prepare and store these details and documents.
          </label>
          <div><Button type="submit" busy={busy}>Prepare request summary</Button></div>
        </form>
      }
      result={
        data && (
          <>
            <Verdict tone={data.documents_complete ? "good" : "money"}>
              {data.documents_complete ? "Checklist complete" : `Preparation incomplete · ${data.missing_required_documents.join(", ") || "confirm policy details"}`}
            </Verdict>
            <Section title="Document checklist">
              <ul className="grid gap-1.5 md:grid-cols-2">
                {data.document_checklist.map((d) => (
                  <li key={d.label} className={cx("flex items-center gap-2 text-body-md", d.provided ? "text-success" : d.required ? "text-danger" : "text-muted")}>
                    <span aria-hidden>{d.provided ? "✓" : d.required ? "!" : "○"}</span> {d.label} {d.required ? "(required)" : "(recommended)"}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Coverage and information warnings">
              <div className="flex flex-col gap-2">
                {data.warnings.length ? data.warnings.map((w, i) => <Notice key={i} tone="warning"><b className="capitalize">{humanize(w.kind)}</b>: {w.message}{w.status ? ` (${w.status})` : ""}</Notice>) : <Notice>No additional warning detected from the supplied information.</Notice>}
              </div>
              {data.coverage_evidence.length > 0 && <div className="mt-4"><h4 className="mb-2 text-label-md">Relevant policy wording</h4><ClauseEvidence items={data.coverage_evidence.map((e) => ({ ...e, quote: e.text }))} /></div>}
            </Section>
            <Section title="Insurer-reviewable summary" actions={<Button variant="secondary" size="sm" onClick={() => downloadText(`preauthorization-${data.preauthorization_id}.txt`, data.summary)}><Download className="size-3.5" aria-hidden /> Export summary (.txt)</Button>}>
              <pre className="reading whitespace-pre-wrap rounded-lg bg-subtle p-4 font-serif text-[0.95rem]">{data.summary}</pre>
            </Section>
            <Section title="Manually recorded authorization status">
              <p className="mb-3 text-body-sm text-muted">Status is entered by you and is not verified by ClaimShield.</p>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                <Button variant="secondary" onClick={saveStatus} busy={saving}>Record status</Button>
                <span className="text-body-sm text-muted">{statusLabel ?? data.authorization_status}</span>
              </div>
              <div className="mt-2"><ErrorBanner message={statusError} /></div>
            </Section>
            <Notice>{data.approval_disclaimer}</Notice>
          </>
        )
      }
    />
  );
}
