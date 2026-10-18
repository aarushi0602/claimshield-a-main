import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Notice, Select, Table, Verdict } from "../../components/ui";
import { FilePicker } from "../../components/files";
import { BulletList, ClauseEvidence, Section, ToolPage } from "../../components/tool";
import { postForm } from "../../lib/api";
import { humanize, inr, today } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { useUploads } from "../../state/uploads";

export const ROOM_CATEGORIES = ["General", "Shared", "Semi-private", "Private", "ICU"];
const COST_CATEGORIES = [["OTHER", "Other"], ["ROOM", "Room"], ["ICU", "ICU"], ["PROCEDURE", "Procedure"], ["PHARMACY", "Pharmacy"], ["CONSUMABLE", "Consumable"], ["NON_MEDICAL", "Non-medical"], ["PERSONAL", "Personal item"], ["LAB", "Laboratory"], ["RADIOLOGY", "Radiology"], ["THERAPY", "Therapy"]];

interface Result {
  estimated_insurer_payment: number;
  estimated_patient_payment: number;
  breakdown: Record<string, number | null>;
  applied_rules: ({ rule: string } & Record<string, unknown>)[];
  missing_inputs: string[];
  uncertainty: string[];
  policy_evidence: { clause_id: string; title: string; quote: string; source: string; page?: number }[];
}

interface CostLine {
  id: number;
  description: string;
  category: string;
  amount: string;
}

export default function Preclaim() {
  const uploads = useUploads();
  const [policy, setPolicy] = useState<File[]>([]);
  const [lines, setLines] = useState<CostLine[]>([]);
  const { data, error, busy, run } = useAsync<Result>();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.append("policy", policy[0]);
    const items = lines.map((l) => ({ description: l.description.trim(), category: l.category, amount: Number(l.amount) })).filter((i) => i.description && i.amount > 0);
    if (items.length) form.append("cost_items", JSON.stringify(items));
    if (form.get("network_hospital") === "") form.delete("network_hospital");
    for (const key of ["patient_age", "room_rate_per_day", "deductible"]) if (form.get(key) === "") form.delete(key);
    run(() => postForm<Result>("/api/preclaim", form, "Check the policy PDF and assessment inputs."));
  };

  const b = data?.breakdown;
  const rows: [string, number | null | undefined][] = data && b ? [
    ["Estimated treatment and hospital costs", b.estimated_total],
    ["Estimated non-payable costs", b.excluded_estimate],
    ["Room-rent excess", b.room_excess],
    ["Eligible estimate before co-payment", b.after_sublimit],
    ["Co-payment", b.copay],
    ["Deductible", b.deductible],
    ["Estimated insurer payment", data.estimated_insurer_payment],
    ["Estimated patient payment", data.estimated_patient_payment],
  ] : [];

  return (
    <ToolPage
      eyebrow="Claim tools · plan treatment"
      title="Pre-claim coverage estimate"
      description="Estimate likely policy coverage before planned treatment. Upload your policy wording and enter your current cost estimate."
      error={error}
      form={
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FilePicker label="Insurance policy (PDF)" files={policy} onFiles={setPolicy} required reuse={uploads.mainPolicyFile ? [uploads.mainPolicyFile] : []} reuseLabel="Use the policy from your audit" />
            <Field label="Proposed treatment"><Input name="treatment" required maxLength={160} placeholder="e.g. Total knee replacement" /></Field>
            <Field label="Estimated total (₹)"><Input name="estimated_total" type="number" min="1" step="0.01" required /></Field>
            <Field label="Room category">
              <Select name="room_category" required defaultValue=""><option value="">Choose a category</option>{ROOM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
            </Field>
            <Field label="Room rate per day (₹)"><Input name="room_rate_per_day" type="number" min="0" step="0.01" /></Field>
            <Field label="Expected nights"><Input name="nights" type="number" min="1" max="365" defaultValue={1} required /></Field>
            <Field label="Planned hospitalization date"><Input name="hospitalization_date" type="date" defaultValue={today()} required /></Field>
            <Field label="Hospital network status">
              <Select name="network_hospital" defaultValue=""><option value="">Not sure</option><option value="true">Network</option><option value="false">Non-network</option></Select>
            </Field>
            <Field label="Patient age (optional)"><Input name="patient_age" type="number" min="0" max="120" /></Field>
            <Field label="Deductible override (₹, optional)" hint="Use only if confirmed by the insurer"><Input name="deductible" type="number" min="0" step="0.01" /></Field>
          </div>
          <div className="rounded-lg border border-line bg-subtle p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-label-md text-ink">Estimated expense lines (optional)</h3>
                <p className="text-body-sm text-muted">Add lines to include category exclusions. If provided, line amounts must add up to the estimated total.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setLines((l) => [...l, { id: Date.now(), description: "", category: "OTHER", amount: "" }])}><Plus className="size-3.5" aria-hidden /> Add expense</Button>
            </div>
            <div className="flex flex-col gap-2">
              {lines.map((l) => (
                <div key={l.id} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                  <Input aria-label="Expense description" placeholder="Expense description" maxLength={160} value={l.description} onChange={(e) => setLines((all) => all.map((x) => (x.id === l.id ? { ...x, description: e.target.value } : x)))} />
                  <Select aria-label="Expense category" value={l.category} onChange={(e) => setLines((all) => all.map((x) => (x.id === l.id ? { ...x, category: e.target.value } : x)))}>
                    {COST_CATEGORIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </Select>
                  <Input aria-label="Estimated expense amount" type="number" min="0.01" step="0.01" placeholder="Amount (₹)" value={l.amount} onChange={(e) => setLines((all) => all.map((x) => (x.id === l.id ? { ...x, amount: e.target.value } : x)))} />
                  <Button variant="ghost" size="sm" aria-label="Remove expense" onClick={() => setLines((all) => all.filter((x) => x.id !== l.id))}><Trash2 className="size-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" busy={busy} disabled={!policy.length}>Estimate coverage</Button>
            <span className="text-body-sm text-muted">The estimate is not a guarantee of claim approval.</span>
          </div>
        </form>
      }
      result={
        data && (
          <>
            <Verdict tone="money">Estimated insurer payment: <b>{inr(data.estimated_insurer_payment)}</b> · Estimated patient payment: <b>{inr(data.estimated_patient_payment)}</b></Verdict>
            <Notice>Estimate only. This does not guarantee actual claim approval or settlement.</Notice>
            <Section title="Breakdown">
              <Table head={["Item", <span className="block text-right">Amount</span>]}>
                {rows.filter(([, v]) => v !== null && v !== undefined).map(([label, v]) => (
                  <tr key={label}><td className="px-4 py-2.5">{label}</td><td className="tnum px-4 py-2.5 text-right">{inr(v)}</td></tr>
                ))}
              </Table>
            </Section>
            {data.applied_rules.length > 0 && (
              <Section title="Rules applied">
                <BulletList items={data.applied_rules.map((r) => `${humanize(r.rule)}: ${Object.entries(r).filter(([k]) => k !== "rule").map(([k, v]) => `${humanize(k)} ${typeof v === "number" ? inr(v) : String(v)}`).join(", ")}`)} />
              </Section>
            )}
            {data.missing_inputs.length > 0 && <Section title="Inputs needing confirmation"><BulletList items={data.missing_inputs} /></Section>}
            {data.uncertainty.length > 0 && <Section title="Uncertainty"><BulletList items={data.uncertainty} /></Section>}
            <Section title="Relevant policy evidence"><ClauseEvidence items={data.policy_evidence} /></Section>
          </>
        )
      }
    />
  );
}
