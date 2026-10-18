import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bed, CheckCircle2, Clock, FileSearch, FolderOpen, Link2, Loader2, Pill as PillIcon, RefreshCw, Stethoscope, Terminal, UserRound, XCircle } from "lucide-react";
import { Card, CopyButton, ErrorBanner, cx } from "../components/ui";
import type { TraceEvent } from "../lib/api";

interface StepDef {
  agent: string;
  title: string;
  waiting: string;
}

const CORE_STEPS: StepDef[] = [
  { agent: "intake_agent", title: "Intake & parsing", waiting: "Reads the bill and policy into structured data" },
  { agent: "policy_agent", title: "Clause index", waiting: "Retrieves the governing policy clauses" },
  { agent: "benchmark_agent", title: "Pricing bench", waiting: "Compares charges with reference prices" },
  { agent: "audit_agent", title: "Claim audit", waiting: "Checks errors and replays the settlement" },
  { agent: "reconciliation_agent", title: "Reconciliation", waiting: "Waiting for audit completion" },
  { agent: "dispute_agent", title: "Dispute report", waiting: "Pending letter and report drafting" },
];
const PRE_STEP: StepDef = { agent: "document_agent", title: "Document check", waiting: "Classifies uploaded PDFs" };
const POST_STEPS: StepDef[] = [
  { agent: "clause_review_agent", title: "Clause review", waiting: "Compares medical evidence with clauses" },
  { agent: "guidance_agent", title: "Next steps", waiting: "Builds your action plan" },
];

type StepState = "pending" | "running" | "done" | "error";

const KIND_STYLE: Record<string, string> = {
  start: "bg-action/25 text-[#9dcaff]",
  tool: "bg-white/10 text-[#d3e4fe]",
  info: "bg-white/5 text-[#93a8bb]",
  result: "bg-teal/25 text-[#6bd8cb]",
  warn: "bg-warning/30 text-[#fcd34d]",
  error: "bg-danger/40 text-[#fca5a5]",
  done: "bg-teal/40 text-[#89f5e7]",
};

export function deriveSteps(events: TraceEvent[]) {
  const seen = new Set(events.map((e) => e.agent));
  const defs = [...(seen.has(PRE_STEP.agent) ? [PRE_STEP] : []), ...CORE_STEPS, ...POST_STEPS.filter((s) => seen.has(s.agent))];
  const failed = events.some((e) => e.agent === "orchestrator" && e.kind === "error");
  return defs.map((def) => {
    const mine = events.filter((e) => e.agent === def.agent);
    let state: StepState = "pending";
    if (mine.some((e) => e.kind === "error")) state = "error";
    else if (mine.some((e) => e.kind === "result")) state = "done";
    else if (mine.some((e) => e.kind === "start")) state = failed ? "error" : "running";
    const last = [...mine].reverse().find((e) => e.kind !== "start") ?? mine[mine.length - 1];
    return { ...def, state, caption: last?.message ?? def.waiting };
  });
}

function StepCard({ index, title, caption, state }: { index: number; title: string; caption: string; state: StepState }) {
  const Icon = state === "done" ? CheckCircle2 : state === "running" ? RefreshCw : state === "error" ? XCircle : Clock;
  return (
    <div
      className={cx(
        "flex min-h-40 flex-col rounded-xl border p-4 transition",
        state === "running" ? "border-action/40 bg-action-soft shadow-z2" : state === "error" ? "border-danger/30 bg-danger-bg" : "border-line bg-subtle",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cx("text-label-sm uppercase", state === "running" ? "text-action" : "text-muted")}>
          Step {String(index).padStart(2, "0")}
          {state === "running" && " · running"}
        </span>
        <Icon
          className={cx(
            "size-5",
            state === "done" && "text-action",
            state === "running" && "animate-spin text-action [animation-duration:2s]",
            state === "error" && "text-danger",
            state === "pending" && "text-line-strong",
          )}
          aria-hidden
        />
      </div>
      <p className={cx("mt-2 text-headline-sm", state === "pending" ? "text-muted" : "text-ink")}>{title}</p>
      <p className="mt-1 line-clamp-3 flex-1 text-body-sm text-muted">{caption}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
        <div
          className={cx("h-full rounded-full transition-all duration-500", state === "error" ? "bg-danger" : "bg-navy")}
          style={{ width: state === "done" || state === "error" ? "100%" : state === "running" ? "60%" : "0%" }}
        />
      </div>
    </div>
  );
}

const SKELETON_ICONS = [Bed, Stethoscope, PillIcon, UserRound];

export default function AuditProgress({
  caseId,
  events,
  connected,
  stage,
  error,
}: {
  caseId: string;
  events: TraceEvent[];
  connected: boolean;
  stage?: string;
  error?: string | null;
}) {
  const steps = useMemo(() => deriveSteps(events), [events]);
  const done = steps.filter((s) => s.state === "done").length;
  const running = steps.findIndex((s) => s.state === "running");
  const pct = Math.round((done / steps.length) * 100);
  const elapsed = events.length ? events[events.length - 1].t : 0;
  const log = useRef<HTMLOListElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [events.length]);

  const shareLink = `${window.location.origin}${window.location.pathname}#/cases/${caseId}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg bg-container px-3 py-1 font-mono text-label-md text-navy">
              <span className="size-2 rounded-full bg-action animate-pulse-dot" aria-hidden /> {caseId}
            </span>
            <h1 className="text-headline-lg text-ink">Checking your claim</h1>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-body-md text-muted" role="status">
            <Clock className="size-4" aria-hidden />
            {stage === "queued" && events.length === 0
              ? "Your review is safely queued. Keep this page link to return later."
              : `Running for ${elapsed.toFixed(0)}s · results appear here automatically`}
          </p>
        </div>
      </div>

      <ErrorBanner message={error} />

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-label-sm uppercase text-action">
              <FileSearch className="size-3.5" aria-hidden /> Agent claim audit pipeline
            </p>
            <p className="mt-1 text-body-md text-muted">
              {running >= 0 ? `Stage ${running + 1} of ${steps.length} active · ${steps[running].caption}` : done === steps.length ? "All stages complete" : "Waiting for the first agent…"}
            </p>
          </div>
          <span className="tnum text-label-md text-navy">{pct}% complete</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {steps.map((s, i) => (
            <StepCard key={s.agent} index={i + 1} title={s.title} caption={s.caption} state={s.state} />
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-xl border border-[#0b2a44] bg-[#0b1c30] shadow-z3">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 text-body-sm">
            <div className="flex items-center gap-3 text-white">
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-[#ef4444]" />
                <span className="size-2.5 rounded-full bg-[#76b8fe]" />
                <span className="size-2.5 rounded-full bg-[#6bd8cb]" />
              </span>
              <Terminal className="size-4 text-[#9dcaff]" aria-hidden />
              <span className="font-mono">agent trace · live stream</span>
            </div>
            <span className={cx("flex items-center gap-1.5 font-mono text-label-sm uppercase", connected ? "text-[#6bd8cb]" : "text-[#93a8bb]")}>
              <span className={cx("size-1.5 rounded-full", connected ? "bg-[#6bd8cb] animate-pulse-dot" : "bg-[#93a8bb]")} aria-hidden />
              {connected ? "Stream connected" : events.length ? "Reconnecting" : "Connecting"}
            </span>
          </div>
          <ol ref={log} aria-live="polite" className="h-96 overflow-y-auto px-4 py-3 font-mono text-[0.8rem] leading-relaxed">
            {events.length === 0 && (
              <li className="flex items-center gap-2 text-[#93a8bb]">
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Waiting for the first agent event…
              </li>
            )}
            {events.map((e) => (
              <li key={e.seq} className="grid grid-cols-[3.5rem_4.5rem_1fr] gap-2 py-0.5 sm:grid-cols-[3.5rem_4.5rem_10rem_1fr]">
                <span className="text-[#5f7a93]">{e.t.toFixed(2)}s</span>
                <span className={cx("h-fit rounded px-1.5 text-center text-[0.68rem] font-bold uppercase", KIND_STYLE[e.kind] ?? KIND_STYLE.info)}>{e.kind}</span>
                <span className="hidden truncate text-[#6bd8cb] sm:block">{e.agent}</span>
                <span className={cx(e.kind === "error" ? "text-[#fca5a5]" : e.kind === "warn" ? "text-[#fcd34d]" : e.kind === "result" ? "text-[#a7f3d0]" : "text-[#d6e2ec]")}>{e.message}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2 font-mono text-[0.72rem] text-[#93a8bb]">
            <span>Events: {events.length} · Stages done: {done}/{steps.length}</span>
            <span>Elapsed {elapsed.toFixed(1)}s</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="text-label-sm uppercase text-muted">Audit progress</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative size-16">
                <svg viewBox="0 0 36 36" className="size-16 -rotate-90" aria-hidden>
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-line)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-action)" strokeWidth="3" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} strokeLinecap="round" />
                </svg>
                <span className="tnum absolute inset-0 grid place-items-center text-label-md text-navy">{pct}%</span>
              </div>
              <p className="text-body-sm text-muted">{done} of {steps.length} agent stages finished.</p>
            </div>
          </Card>
          <Card className="border-action/20 bg-container-low p-5">
            <p className="flex items-center gap-2 text-label-md text-navy">
              <RefreshCw className="size-4" aria-hidden /> Safe background processing
            </p>
            <p className="mt-2 text-body-sm text-ink">
              The audit runs on the server. You can close this tab and come back with this link, or find it later in Case history.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link2 className="size-3.5 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-mono text-body-sm text-muted">{caseId}</span>
              <CopyButton text={shareLink} label="Copy link" />
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <p className="flex items-center gap-2 text-label-sm uppercase text-action">
          <RefreshCw className="size-3.5 animate-spin [animation-duration:3s]" aria-hidden /> Synthesising line-by-line findings
        </p>
        <h2 className="mt-1 text-headline-md text-ink">Itemised discrepancy breakdown</h2>
        <p className="text-body-sm text-muted">This table fills in when the audit finishes.</p>
        <div className="mt-4 overflow-hidden rounded-lg border border-line" aria-hidden>
          <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_2fr] gap-4 bg-subtle px-4 py-2.5 text-label-sm uppercase text-muted">
            <span>Line item</span><span>Billed</span><span>Policy allows</span><span>Disputed</span><span>Clause / rule</span>
          </div>
          {SKELETON_ICONS.map((Icon, i) => (
            <div key={i} className="grid grid-cols-[2.5fr_1fr_1fr_1fr_2fr] items-center gap-4 border-t border-neutral-bg px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-action-soft text-action/60"><Icon className="size-4" /></span>
                <div className="flex-1 space-y-1.5"><div className="h-3 w-3/4 animate-pulse rounded bg-line" /><div className="h-2.5 w-1/3 animate-pulse rounded bg-neutral-bg" /></div>
              </div>
              <div className="h-3 animate-pulse rounded bg-line" />
              <div className="h-3 animate-pulse rounded bg-line" />
              <div className="h-3 animate-pulse rounded bg-danger-bg" />
              <div className="h-3 animate-pulse rounded bg-line" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-body-sm text-muted">Processing pipeline {pct}%</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-action transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-body-md font-semibold text-ink hover:bg-neutral-bg">
          <ArrowLeft className="size-4" aria-hidden /> Back to overview
        </Link>
        <Link to="/history" className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-body-md font-semibold text-ink hover:bg-neutral-bg">
          <FolderOpen className="size-4" aria-hidden /> Case history
        </Link>
      </div>
    </div>
  );
}
