import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, Calculator, CheckCircle2, ClipboardCheck, FileSearch, FileText, Gavel, Landmark,
  Lock, Receipt, Scale, ShieldCheck, Sparkles, UserCheck,
} from "lucide-react";
import { Badge, Button, Card, ErrorBanner, Eyebrow, Pill, Spinner } from "../components/ui";
import { inr } from "../lib/format";
import { useRunSample, useSamples } from "../lib/hooks";
import type { SampleBill } from "../lib/types";

const STEPS = [
  {
    n: "01",
    title: "Upload & ingest",
    body: "Add your itemised hospital bill and your policy wording. Line items, insurer deductions and numbered policy clauses are extracted into structured data.",
    tag: "Document AI or local PDF parsing",
    icon: Receipt,
  },
  {
    n: "02",
    title: "Agent audit",
    body: "Specialist agents check duplicates, quantity × rate errors, length of stay, pricing benchmarks, and replay the insurer's settlement under your policy's terms.",
    tag: "Every finding cites a bill line and a clause",
    icon: FileSearch,
  },
  {
    n: "03",
    title: "Dispute & recover",
    body: "Get a reconciliation of what you should owe, plus ready-to-send letters to the insurer and the hospital that quote the exact policy wording.",
    tag: "Grievance-ready letters and PDF report",
    icon: Gavel,
  },
];

const CAPABILITIES = [
  { icon: Receipt, title: "Line-by-line extraction", body: "Reads the itemised bill, insurer deductions and settlement totals, and keeps each figure tied to its source line." },
  { icon: Calculator, title: "Policy replay calculator", body: "Rebuilds the settlement step by step (non-payables, room rent, sub-limits, co-pay) so each disputed rupee is accounted for once." },
  { icon: Landmark, title: "Pricing references", body: "Compares charges against reference tariffs and typical coding for the procedure. Benchmark gaps are flagged as worth reviewing, never as fraud." },
  { icon: FileText, title: "Dispute letter generator", body: "Drafts separate letters to the insurer's grievance cell and the hospital billing desk, citing clauses and amounts from the evidence." },
  { icon: ClipboardCheck, title: "Claim journey tools", body: "Check documents, prepare cashless pre-authorization, understand a rejection, compare treatment options and track the claim timeline." },
  { icon: UserCheck, title: "Human review built in", body: "An insurer-side reviewer workspace records outcomes and disagreements, and false positives are measured on a labelled synthetic set." },
];

const TRUST = [
  { icon: Lock, title: "Authenticated workspaces", body: "Deployed mode signs users in through Google Identity-Aware Proxy and keeps each tenant's cases separate." },
  { icon: BadgeCheck, title: "Evidence before conclusions", body: "Findings show the bill line, the policy clause and the calculation. Anything unproven is labelled as needing review." },
  { icon: Scale, title: "Worth disputing, not fraud", body: "ClaimShield never alleges fraud or gives legal advice. It tells you what to ask about and why." },
  { icon: ShieldCheck, title: "Synthetic demo data", body: "All sample patients, hospitals, bills and policies are fictional, so you can explore safely." },
];

function SampleCard({ bill, onRun, busy }: { bill: SampleBill; onRun: () => void; busy: boolean }) {
  return (
    <Card as="article" className="flex flex-col p-5 transition-shadow hover:shadow-z2">
      <div className="mb-3 flex items-center justify-between gap-2">
        {bill.clean ? <Badge tone="success">Clean bill</Badge> : <Badge tone="warning">Planted issues</Badge>}
        <span className="text-label-sm uppercase text-muted">{bill.id}</span>
      </div>
      <h3 className="text-headline-sm text-ink">{bill.hospital}</h3>
      <p className="mb-4 text-body-sm text-muted">{bill.procedure}</p>
      <dl className="tnum mb-4 grid grid-cols-2 gap-y-1.5 text-body-sm">
        <dt className="text-muted">Billed</dt>
        <dd className="text-right font-semibold">{inr(bill.gross)}</dd>
        <dt className="text-muted">Insurer approved</dt>
        <dd className="text-right font-semibold">{inr(bill.insurer_approved)}</dd>
        <dt className="text-muted">Patient asked to pay</dt>
        <dd className="text-right font-semibold text-navy">{inr(bill.patient_payable)}</dd>
      </dl>
      <div className="mt-auto flex flex-col gap-2">
        <Button variant="secondary" size="sm" onClick={onRun} busy={busy} className="w-full">
          Run audit <ArrowRight className="size-3.5" aria-hidden />
        </Button>
        <a href={bill.url} target="_blank" rel="noopener" className="text-center text-body-sm text-action hover:underline">
          View synthetic bill
        </a>
      </div>
    </Card>
  );
}

export default function Landing() {
  const { catalog, error } = useSamples();
  const sample = useRunSample();
  const bills = catalog ? Object.values(catalog.bills) : [];
  const hero = bills.find((b) => !b.clean) ?? bills[0];

  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center pt-4 text-center">
        <Pill>
          <ShieldCheck className="size-3.5" aria-hidden /> Health insurance claim protection
        </Pill>
        <h1 className="mt-5 text-[2.25rem] font-bold leading-tight tracking-tight text-ink md:text-[3rem]">
          Know what your health insurance <br className="hidden md:block" />
          should <em className="text-action">really pay</em>.
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-muted">
          ClaimShield AI compares itemised hospital bills against your policy wording and pricing references. It finds
          duplicate charges, arithmetic errors and settlement deductions that don't match your policy, then drafts the
          dispute for you.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="navy" onClick={() => hero && sample.run(hero.id)} busy={!!hero && sample.busy === hero.id} disabled={!hero}>
            Try with a sample case <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Link to="/audit/new" className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-6 py-3 text-body-lg font-semibold text-ink hover:bg-neutral-bg">
            Audit your own claim
          </Link>
        </div>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-body-sm text-muted">
          {["Reproducible money math", "Policy clauses cited verbatim", "Works fully offline in demo mode"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-teal" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-4 w-full max-w-xl"><ErrorBanner message={sample.error || error} /></div>
      </section>

      {/* Dossier preview with real sample data */}
      {hero ? (
        <Card className="mx-auto w-full max-w-5xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-navy px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <FileSearch className="size-5" aria-hidden />
              <div>
                <p className="text-headline-sm">Audit dossier · {hero.id}</p>
                <p className="text-body-sm text-white/75">
                  {hero.hospital} · {hero.procedure} · {hero.patient} (synthetic)
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-label-sm uppercase">Synthetic sample</span>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-4">
            {[
              ["Billed by hospital", inr(hero.gross), "From the itemised bill"],
              ["Insurer approved", inr(hero.insurer_approved), "Printed settlement"],
              ["Patient asked to pay", inr(hero.patient_payable), "Before ClaimShield"],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-lg border border-line p-4">
                <p className="text-label-sm uppercase text-muted">{label}</p>
                <p className="tnum mt-1 text-headline-md font-bold">{value}</p>
                <p className="text-body-sm text-muted">{sub}</p>
              </div>
            ))}
            <div className="flex flex-col justify-between rounded-lg border border-teal/30 bg-teal-soft/50 p-4">
              <div>
                <p className="text-label-sm uppercase text-teal">Potential recovery</p>
                <p className="mt-1 text-body-md text-ink">Run the audit to see what you should owe under the policy.</p>
              </div>
              <Button size="sm" className="mt-3" onClick={() => sample.run(hero.id)} busy={sample.busy === hero.id}>
                <Sparkles className="size-3.5" aria-hidden /> Run this case
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        !error && <div className="text-center"><Spinner label="Loading sample cases…" /></div>
      )}

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-8 text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 text-headline-lg text-ink">How ClaimShield AI recovers what you're owed</h2>
          <p className="mt-2 text-body-md text-muted">From an ambiguous hospital bill to a dispute you can send.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ n, title, body, tag, icon: Icon }) => (
            <Card key={n} className="flex flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg border border-line text-label-md text-navy">{n}</span>
                <Icon className="size-5 text-action" aria-hidden />
              </div>
              <h3 className="text-headline-sm text-ink">{title}</h3>
              <p className="mt-2 flex-1 text-body-md text-muted">{body}</p>
              <p className="mt-4 rounded-md bg-container-low px-3 py-2 text-body-sm text-navy">{tag}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Sample showcase */}
      {bills.length > 0 && (
        <section className="mx-auto w-full max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Pill>Pre-loaded simulations</Pill>
              <h2 className="mt-3 text-headline-lg text-ink">Interactive sample cases</h2>
              <p className="mt-1 text-body-md text-muted">
                Each synthetic bill has planted issues, except one clean bill that shows ClaimShield doesn't over-flag.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bills.map((b) => (
              <SampleCard key={b.id} bill={b} onRun={() => sample.run(b.id)} busy={sample.busy === b.id} />
            ))}
          </div>
        </section>
      )}

      {/* Capabilities */}
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-8 text-center">
          <Eyebrow>Capabilities</Eyebrow>
          <h2 className="mt-2 text-headline-lg text-ink">Built for precise, defensible claim audits</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-action-soft text-action">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-headline-sm text-ink">{title}</h3>
              <p className="mt-2 text-body-md text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto w-full max-w-6xl rounded-2xl bg-navy p-8 text-white md:p-10">
        <span className="rounded bg-white/10 px-2 py-1 text-label-sm uppercase">How your claim is handled</span>
        <h2 className="mt-4 max-w-2xl text-headline-lg">Careful with your data, honest about what it knows</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-white/15 bg-white/5 p-5">
              <Icon className="size-5 text-teal-soft" aria-hidden />
              <h3 className="mt-3 text-label-md">{title}</h3>
              <p className="mt-1.5 text-body-sm text-white/75">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <Card className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 p-6 md:p-8">
        <div>
          <h2 className="text-headline-md text-ink">Stop leaving insurance benefits on the table.</h2>
          <p className="mt-1 text-body-md text-muted">Run a sample audit in under a minute. No sign-up needed in demo mode.</p>
        </div>
        <Link to="/audit/new" className="inline-flex items-center gap-2 rounded-lg bg-action px-5 py-2.5 text-body-md font-semibold text-white shadow-z1 hover:bg-action-hover">
          Start an audit <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Card>
    </div>
  );
}
