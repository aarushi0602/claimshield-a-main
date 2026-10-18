import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, FileStack, Info, Receipt, ScanSearch, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Card, ErrorBanner, Eyebrow, Field, PageHeader, Pill, Select, SyntheticNotice, cx } from "../components/ui";
import { DropZone, MAX_TOTAL_BYTES } from "../components/files";
import { postForm } from "../lib/api";
import { inr } from "../lib/format";
import { useSamples } from "../lib/hooks";
import { useUploads } from "../state/uploads";

const CHECKS = [
  { title: "Bill integrity checks", body: "Duplicate entries, quantity × rate errors, room days beyond the stay, and totals that don't add up." },
  { title: "Policy replay", body: "Re-computes the settlement with your policy's co-pay, sub-limits, room-rent limit and non-payable items." },
  { title: "Pricing & coding references", body: "Compares unit prices with reference tariffs and flags higher-grade coding than the procedure usually needs." },
];

function DocumentCard({
  index,
  kind,
  title,
  description,
  icon,
  children,
}: {
  index: string;
  kind: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-line bg-container-low/60 px-6 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-lg border border-line bg-surface text-navy">{icon}</span>
          <div>
            <p className="text-label-sm uppercase text-action">
              Document {index} <span className="text-muted">· {kind}</span>
            </p>
            <h2 className="text-headline-sm text-ink">{title}</h2>
          </div>
        </div>
        <Badge tone="info" icon={false}>Required</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <p className="text-body-md text-muted">{description}</p>
        {children}
      </div>
    </Card>
  );
}

export default function NewAudit() {
  const navigate = useNavigate();
  const uploads = useUploads();
  const { catalog, error: samplesError } = useSamples();
  const [sample, setSample] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasUploads = uploads.medical.length > 0 && uploads.insurance.length > 0;
  const ready = Boolean(sample) || hasUploads;
  const selectedSample = sample && catalog ? catalog.bills[sample] : null;

  const chooseSample = (id: string) => {
    setSample((current) => (current === id ? null : id));
    uploads.clear();
    setError(null);
  };

  const submit = async () => {
    setError(null);
    const form = new FormData();
    let url = "/api/audit";
    if (sample) {
      form.append("sample_bill", sample);
    } else {
      const total = [...uploads.medical, ...uploads.insurance].reduce((s, f) => s + f.size, 0);
      if (total > MAX_TOTAL_BYTES) {
        setError("Choose at most 50 MB of documents in total.");
        return;
      }
      uploads.medical.forEach((f) => form.append("medical_documents", f));
      uploads.insurance.forEach((f) => form.append("insurance_documents", f));
      form.append("main_bill", String(uploads.mainBill));
      form.append("main_policy", String(uploads.mainPolicy));
      form.append("claim_type", uploads.claimType);
      url = "/api/claim-review";
    }
    setBusy(true);
    try {
      const { case_id } = await postForm<{ case_id: string }>(url, form, "Could not start the audit.");
      navigate(`/cases/${case_id}`);
    } catch (e) {
      setError((e as Error).message || "Could not reach the audit service. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pill>
          <span className="size-1.5 rounded-full bg-action" aria-hidden /> Agent pipeline · document check → audit → dispute
        </Pill>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1 text-label-md text-muted">
          <ShieldCheck className="size-3.5 text-navy" aria-hidden /> One patient, one claim per audit
        </span>
      </div>

      <PageHeader
        title="Audit your health insurance claim"
        description="Upload your itemised hospital bill and your policy wording to find discrepancies and settlement deductions that don't match your policy."
      />

      <Card className="flex items-start gap-4 border-action/20 bg-container-low p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy text-white">
          <ScanSearch className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-label-md text-ink">Documents are checked before the audit</h2>
          <p className="mt-1 text-body-md text-ink">
            Uploaded in the wrong slot? ClaimShield classifies each PDF from its text, so it can tell a policy from a
            bill and list missing claim documents before you rely on the result.
          </p>
          <p className="mt-1 text-body-sm text-muted">
            The selected main bill and policy drive the audit. Supporting files (discharge summary, reports,
            prescriptions, endorsements) feed the completeness check and clause comparison.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <DocumentCard
          index="01"
          kind="Itemised ledger"
          title="Medical documents"
          description="Itemised final hospital bill, plus any discharge summary, reports, prescriptions and receipts for the same claim."
          icon={<Receipt className="size-5" aria-hidden />}
        >
          <DropZone
            files={uploads.medical}
            onFiles={(files) => {
              uploads.setMedical(files);
              if (files.length) setSample(null);
            }}
            onError={setError}
            title="Drag & drop your hospital bill PDFs, or"
            hint="Up to 10 PDFs · 15 MB each"
          />
          {uploads.medical.length > 1 && (
            <Field label="Which file is the itemised hospital bill?">
              <Select value={uploads.mainBill} onChange={(e) => uploads.setMainBill(Number(e.target.value))}>
                {uploads.medical.map((f, i) => (
                  <option key={i} value={i}>{f.name}</option>
                ))}
              </Select>
            </Field>
          )}
        </DocumentCard>

        <DocumentCard
          index="02"
          kind="Policy wording / schedule"
          title="Insurance documents"
          description="Full policy wording with the schedule, plus any endorsements and renewal notices. Room-rent limits, co-pay and sub-limits are read from here."
          icon={<Shield className="size-5" aria-hidden />}
        >
          <DropZone
            files={uploads.insurance}
            onFiles={(files) => {
              uploads.setInsurance(files);
              if (files.length) setSample(null);
            }}
            onError={setError}
            title="Drag & drop your policy PDFs, or"
            hint="Up to 10 PDFs · 15 MB each"
            icon={<FileStack className="size-5" aria-hidden />}
          />
          {uploads.insurance.length > 1 && (
            <Field label="Which file contains the main policy wording?">
              <Select value={uploads.mainPolicy} onChange={(e) => uploads.setMainPolicy(Number(e.target.value))}>
                {uploads.insurance.map((f, i) => (
                  <option key={i} value={i}>{f.name}</option>
                ))}
              </Select>
            </Field>
          )}
        </DocumentCard>
      </div>

      <Card className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="How are you claiming?" hint="Changes which claim documents are expected.">
          <Select value={uploads.claimType} onChange={(e) => uploads.setClaimType(e.target.value as typeof uploads.claimType)} disabled={!!sample}>
            <option value="reimbursement">Reimbursement: I paid the hospital</option>
            <option value="cashless">Cashless: the insurer pays the hospital</option>
            <option value="day_care">Day care: treatment without an overnight stay</option>
          </Select>
        </Field>
        <p className="flex items-center gap-2 text-body-sm text-muted md:max-w-sm">
          <Info className="size-4 shrink-0" aria-hidden /> No bill yet? Use <a className="font-semibold text-action hover:underline" href="#/tools/preclaim">Plan treatment</a> to estimate coverage first.
        </p>
      </Card>

      {/* Samples */}
      <section>
        <Eyebrow>Instant evaluation</Eyebrow>
        <h2 className="mt-1 text-headline-md text-ink">Or explore with a pre-loaded synthetic case</h2>
        <p className="mt-1 text-body-md text-muted">Pick a card to audit a bundled bill and policy. Uploaded files are cleared.</p>
        <ErrorBanner message={samplesError} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {catalog &&
            Object.values(catalog.bills).map((b, i) => {
              const selected = sample === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => chooseSample(b.id)}
                  aria-pressed={selected}
                  className={cx(
                    "relative flex flex-col rounded-xl border bg-surface p-5 text-left shadow-z1 transition",
                    selected ? "border-navy ring-2 ring-navy/20" : "border-line hover:border-action hover:shadow-z2",
                  )}
                >
                  {selected && (
                    <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded bg-navy px-2 py-0.5 text-label-sm uppercase text-white">
                      <Check className="size-3" aria-hidden /> Selected
                    </span>
                  )}
                  <span className="text-label-sm uppercase text-muted">Hospital case {String(i + 1).padStart(2, "0")}</span>
                  <span className="mt-1 text-headline-sm text-ink">{b.hospital}</span>
                  <span className="text-body-sm text-muted">{b.procedure}</span>
                  <dl className="tnum mt-4 grid grid-cols-2 gap-y-1 rounded-lg bg-subtle p-3 text-body-sm">
                    <dt className="text-muted">Patient</dt>
                    <dd className="text-right">{b.patient}</dd>
                    <dt className="text-muted">Policy</dt>
                    <dd className="text-right">{b.policy_plan}</dd>
                    <dt className="text-muted">Billed</dt>
                    <dd className="text-right font-semibold">{inr(b.gross)}</dd>
                  </dl>
                  <div className="mt-3">
                    {b.clean ? <Badge tone="success">Clean bill · should not be flagged</Badge> : <Badge tone="warning">Planted billing issues</Badge>}
                  </div>
                  <span className="mt-3 flex gap-3 text-body-sm">
                    <a href={b.url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-action hover:underline">View bill</a>
                    <a href={catalog.policies[b.policy]?.url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-action hover:underline">View policy</a>
                  </span>
                </button>
              );
            })}
        </div>
      </section>

      <Card>
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <h2 className="text-label-md text-ink">Checks that run on every audit</h2>
          <span className="text-label-sm uppercase text-muted">6 agents · audit and benchmark in parallel</span>
        </div>
        <ol className="grid gap-4 p-6 md:grid-cols-3">
          {CHECKS.map((c, i) => (
            <li key={c.title} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-action-soft text-label-md text-action">{i + 1}</span>
              <div>
                <p className="text-label-md text-ink">{c.title}</p>
                <p className="mt-0.5 text-body-sm text-muted">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-action/20 bg-container-low/95 p-4 shadow-z3 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <SyntheticNotice className="border-0 bg-transparent px-0 py-0" />
          <p className="text-body-sm text-ink" aria-live="polite">
            {selectedSample
              ? `Sample: ${selectedSample.hospital} · ${selectedSample.procedure} with ${selectedSample.policy_plan}`
              : hasUploads
                ? "Ready. Check your main bill and policy selections before continuing."
                : "Add both document groups, or pick a sample case."}
          </p>
          <ErrorBanner message={error} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              uploads.clear();
              setSample(null);
              setError(null);
            }}
          >
            Reset form
          </Button>
          <Button variant="navy" size="lg" onClick={submit} disabled={!ready} busy={busy}>
            <Sparkles className="size-4" aria-hidden /> Run claim audit <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
