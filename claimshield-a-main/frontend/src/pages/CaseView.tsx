import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJson, streamTrace, type TraceEvent } from "../lib/api";
import { CASE_ID_PATTERN } from "../lib/format";
import type { CaseRecord } from "../lib/types";
import { ErrorBanner, Spinner } from "../components/ui";
import AuditProgress from "./AuditProgress";
import AuditResults from "./AuditResults";

/** Live case page: streams the agent trace while the audit runs (SSE + a polling fallback, as
 * jobs can run on another worker), then loads and renders the results. */
export default function CaseView() {
  const { caseId = "" } = useParams();
  const valid = CASE_ID_PATTERN.test(caseId);
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(valid ? null : "This case link is not valid.");
  const loaded = useRef(false);

  const load = useCallback(async () => {
    const c = await getJson<CaseRecord>(`/api/cases/${caseId}`, "This claim is unavailable.");
    setRecord(c);
    if (c.status !== "running") loaded.current = true;
    return c;
  }, [caseId]);

  useEffect(() => {
    if (!valid) return;
    loaded.current = false;
    setRecord(null);
    setEvents([]);
    setError(null);
    let cancelled = false;
    let poll: ReturnType<typeof setTimeout> | undefined;

    const close = streamTrace(caseId, {
      onEvent: (e) => {
        setConnected(true);
        setEvents((prev) => (prev.some((p) => p.seq === e.seq) ? prev : [...prev, e]));
      },
      onEnd: () => {
        setConnected(false);
        if (!cancelled) load().catch((e: Error) => setError(e.message));
      },
      onError: (message) => {
        setConnected(false);
        if (!cancelled) setError(message);
      },
    });

    const tick = async () => {
      if (cancelled || loaded.current) return;
      try {
        const c = await load();
        if (c.status === "running") poll = setTimeout(tick, 2500);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    poll = setTimeout(tick, 1200);

    return () => {
      cancelled = true;
      close();
      clearTimeout(poll);
    };
  }, [caseId, valid, load]);

  if (!valid) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <Link to="/audit/new" className="text-action hover:underline">Start a new audit</Link>
      </div>
    );
  }

  if (record && record.status !== "running") {
    return <AuditResults record={record} />;
  }

  if (!record && !events.length && !error) {
    return <div className="py-16 text-center"><Spinner label="Opening your claim…" /></div>;
  }

  return <AuditProgress caseId={caseId} events={events} connected={connected} stage={record?.processing_stage} error={error} />;
}
