import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Disclosure, Field, Input, Notice, Select, cx } from "../../components/ui";
import { FilePicker } from "../../components/files";
import { Section, ToolPage } from "../../components/tool";
import { postForm } from "../../lib/api";
import { humanize, inrOr, today } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { useUploads } from "../../state/uploads";
import { ROOM_CATEGORIES } from "./Preclaim";

interface ScenarioInput {
  id: number;
  name: string;
  estimated_total: string;
  room_category: string;
  room_rate_per_day: string;
  hypothetical_sub_limit: string;
  hypothetical_copay_network_pct: string;
  hypothetical_copay_non_network_pct: string;
}

interface Scenario {
  name: string;
  hypothetical: boolean;
  estimated_insurer_payment: number | null;
  estimated_patient_payment: number | null;
  differences: { insurer_payment: number | null; patient_payment: number | null };
  breakdown: Record<string, number | null>;
  overridden_policy_rules?: string[];
}

interface Result {
  notice: string;
  scenarios: Scenario[];
  fixed_policy_values: Record<string, unknown>;
  real_policy_terms: unknown;
}

const blank = (n: number): ScenarioInput => ({ id: Date.now() + n, name: `Option ${n}`, estimated_total: "", room_category: "", room_rate_per_day: "", hypothetical_sub_limit: "", hypothetical_copay_network_pct: "", hypothetical_copay_non_network_pct: "" });
const numeric = (v: FormDataEntryValue | string | null) => (v === "" || v == null ? null : Number(v));

export default function WhatIf() {
  const uploads = useUploads();
  const [policy, setPolicy] = useState<File[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioInput[]>([blank(1)]);
  const [metric, setMetric] = useState<"estimated_insurer_payment" | "estimated_patient_payment">("estimated_insurer_payment");
  const { data, error, busy, run } = useAsync<Result>();

  const update = (id: number, key: keyof ScenarioInput, value: string) => setScenarios((all) => all.map((s) => (s.id === id ? { ...s, [key]: value } : s)));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const base = {
      treatment: d.get("treatment"),
      estimated_total: Number(d.get("estimated_total")),
      room_category: d.get("room_category"),
      room_rate_per_day: numeric(d.get("room_rate_per_day")),
      hospitalization_date: d.get("hospitalization_date"),
      nights: Number(d.get("nights")),
      network_hospital: d.get("network_hospital") === "true",
    };
    const payload = new FormData();
    payload.append("policy", policy[0]);
    payload.append("base", JSON.stringify(base));
    payload.append(
      "scenarios",
      JSON.stringify(
        scenarios.map((s) => ({
          name: s.name.trim(),
          estimated_total: numeric(s.estimated_total),
          room_category: s.room_category || null,
          room_rate_per_day: numeric(s.room_rate_per_day),
          hypothetical_sub_limit: numeric(s.hypothetical_sub_limit),
          hypothetical_copay_network_pct: numeric(s.hypothetical_copay_network_pct),
          hypothetical_copay_non_network_pct: numeric(s.hypothetical_copay_non_network_pct),
        })),
      ),
    );
    run(() => postForm<Result>("/api/what-if", payload, "Check the policy and scenario values."));
  };

  const max = data ? Math.max(1, ...data.scenarios.map((s) => s[metric] ?? 0)) : 1;

  return (
    <ToolPage
      eyebrow="Claim tools · compare options"
      title="What-if coverage simulator"
      description="Compare room choice, cost estimates and clearly marked hypothetical policy values. The real policy stays unchanged."
      error={error}
      form={
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilePicker label="Insurance policy (PDF)" files={policy} onFiles={setPolicy} required reuse={uploads.mainPolicyFile ? [uploads.mainPolicyFile] : []} reuseLabel="Use the policy from your audit" />
            <Field label="Treatment"><Input name="treatment" required maxLength={160} defaultValue="Planned treatment" /></Field>
            <Field label="Current estimate (₹)"><Input name="estimated_total" type="number" min="0.01" step="0.01" required /></Field>
            <Field label="Current room category"><Select name="room_category">{ROOM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Room rate per day (₹)"><Input name="room_rate_per_day" type="number" min="0" step="0.01" /></Field>
            <Field label="Expected nights"><Input name="nights" type="number" min="1" max="365" defaultValue={1} required /></Field>
            <Field label="Hospitalization date"><Input name="hospitalization_date" type="date" defaultValue={today()} required /></Field>
            <Field label="Hospital network"><Select name="network_hospital"><option value="true">Network</option><option value="false">Non-network</option></Select></Field>
          </div>
          <div className="rounded-lg border border-line bg-subtle p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-label-md text-ink">Alternative scenarios</h3>
              <Button variant="secondary" size="sm" disabled={scenarios.length >= 5} onClick={() => setScenarios((s) => [...s, blank(s.length + 1)])}><Plus className="size-3.5" aria-hidden /> Add scenario</Button>
            </div>
            <div className="flex flex-col gap-3">
              {scenarios.map((s) => (
                <div key={s.id} className="grid gap-3 rounded-lg border border-line bg-surface p-3 md:grid-cols-4">
                  <Field label="Scenario name"><Input value={s.name} maxLength={80} required onChange={(e) => update(s.id, "name", e.target.value)} /></Field>
                  <Field label="Estimated cost (₹)"><Input type="number" min="0.01" step="0.01" placeholder="Use current" value={s.estimated_total} onChange={(e) => update(s.id, "estimated_total", e.target.value)} /></Field>
                  <Field label="Room category"><Select value={s.room_category} onChange={(e) => update(s.id, "room_category", e.target.value)}><option value="">Use current</option>{ROOM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
                  <Field label="Room rate/day (₹)"><Input type="number" min="0" step="0.01" placeholder="Use current" value={s.room_rate_per_day} onChange={(e) => update(s.id, "room_rate_per_day", e.target.value)} /></Field>
                  <Field label="Hypothetical sub-limit (₹)"><Input type="number" min="0" step="0.01" placeholder="Keep real rule" value={s.hypothetical_sub_limit} onChange={(e) => update(s.id, "hypothetical_sub_limit", e.target.value)} /></Field>
                  <Field label="Hypothetical network co-pay (%)"><Input type="number" min="0" max="100" step="0.1" placeholder="Keep real rule" value={s.hypothetical_copay_network_pct} onChange={(e) => update(s.id, "hypothetical_copay_network_pct", e.target.value)} /></Field>
                  <Field label="Hypothetical non-network co-pay (%)"><Input type="number" min="0" max="100" step="0.1" placeholder="Keep real rule" value={s.hypothetical_copay_non_network_pct} onChange={(e) => update(s.id, "hypothetical_copay_non_network_pct", e.target.value)} /></Field>
                  <div className="flex items-end"><Button variant="ghost" size="sm" onClick={() => setScenarios((all) => all.filter((x) => x.id !== s.id))}><Trash2 className="size-4" aria-hidden /> Remove option</Button></div>
                </div>
              ))}
            </div>
          </div>
          <div><Button type="submit" busy={busy} disabled={!policy.length}>Compare scenarios</Button></div>
        </form>
      }
      result={
        data && (
          <>
            <Notice>{data.notice}</Notice>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.scenarios.map((s) => (
                <article key={s.name} className="rounded-xl border border-line bg-surface p-5 shadow-z1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-headline-sm text-ink">{s.name}</h3>
                    {s.hypothetical ? <Badge tone="warning">Hypothetical</Badge> : <Badge tone="teal">Extracted policy</Badge>}
                  </div>
                  <div className="tnum mt-3 grid grid-cols-2 gap-3">
                    <div><p className="text-label-sm uppercase text-muted">Insurer estimate</p><p className="text-headline-md font-bold">{inrOr(s.estimated_insurer_payment, "Unavailable")}</p></div>
                    <div><p className="text-label-sm uppercase text-muted">Patient estimate</p><p className="text-headline-md font-bold">{inrOr(s.estimated_patient_payment, "Unavailable")}</p></div>
                  </div>
                  {s.hypothetical && <p className="mt-2 text-body-sm text-muted">Change vs current: insurer {inrOr(s.differences.insurer_payment, "n/a")} · patient {inrOr(s.differences.patient_payment, "n/a")}</p>}
                  <Disclosure summary="Itemised estimate" className="mt-3">
                    <dl className="tnum grid grid-cols-2 gap-y-1 text-body-sm">
                      {Object.entries(s.breakdown).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted capitalize">{humanize(k)}</dt><dd className="text-right">{inrOr(v, "Unavailable")}</dd></div>)}
                    </dl>
                    {!!s.overridden_policy_rules?.length && <p className="mt-2 text-body-sm">Hypothetical rules: {s.overridden_policy_rules.join(", ")}</p>}
                  </Disclosure>
                </article>
              ))}
            </div>
            <Section
              title="Payment comparison"
              actions={
                <div className="flex gap-1" role="tablist">
                  {([["estimated_insurer_payment", "Insurer"], ["estimated_patient_payment", "Patient"]] as const).map(([k, label]) => (
                    <button key={k} type="button" role="tab" aria-selected={metric === k} onClick={() => setMetric(k)} className={cx("rounded-md px-3 py-1 text-label-md", metric === k ? "bg-navy text-white" : "bg-neutral-bg text-ink")}>{label}</button>
                  ))}
                </div>
              }
            >
              <div className="flex flex-col gap-2" role="img" aria-label="Scenario payment comparison">
                {data.scenarios.map((s) => (
                  <div key={s.name} className="grid grid-cols-[8rem_1fr_7rem] items-center gap-3 text-body-sm">
                    <span className="truncate">{s.name}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-neutral-bg"><div className="h-full rounded-full bg-action" style={{ width: `${s[metric] == null ? 0 : Math.max(2, ((s[metric] ?? 0) / max) * 100)}%` }} /></div>
                    <b className="tnum text-right">{inrOr(s[metric], "Unavailable")}</b>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Real policy rules kept fixed">
              <ul className="flex flex-col gap-1 text-body-sm">
                {Object.entries(data.fixed_policy_values).map(([k, v]) => <li key={k}><span className="capitalize text-muted">{humanize(k)}:</span> {v == null ? "Not found in supplied policy" : String(v)}</li>)}
              </ul>
              <p className="mt-2 text-body-sm text-muted">Scenario overrides are limited to sub-limit and co-payment. Room limits and the other rules stay tied to the uploaded policy.</p>
              <Disclosure summary="Extracted policy terms (raw)" className="mt-3">
                <pre className="max-h-72 overflow-auto font-mono text-[0.72rem]">{JSON.stringify(data.real_policy_terms, null, 2)}</pre>
              </Disclosure>
            </Section>
          </>
        )
      }
    />
  );
}
