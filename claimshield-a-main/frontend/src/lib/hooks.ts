import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJson, postForm } from "./api";
import type { SampleCatalog } from "./types";

export function useSamples() {
  const [catalog, setCatalog] = useState<SampleCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getJson<SampleCatalog>("/api/samples", "Could not load the sample cases.").then(setCatalog).catch((e: Error) => setError(e.message));
  }, []);
  return { catalog, error };
}

/** Start an audit for a bundled synthetic case and open its live view. */
export function useRunSample() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async (sampleId: string) => {
      setBusy(sampleId);
      setError(null);
      try {
        const form = new FormData();
        form.append("sample_bill", sampleId);
        const { case_id } = await postForm<{ case_id: string }>("/api/audit", form, "Could not start the audit.");
        navigate(`/cases/${case_id}`);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [navigate],
  );
  return { run, busy, error };
}

/** Generic async form submit state. */
export function useAsync<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (work: () => Promise<T>) => {
    setBusy(true);
    setError(null);
    try {
      const result = await work();
      setData(result);
      return result;
    } catch (e) {
      setError((e as Error).message || "The request could not be completed.");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);
  return { data, error, busy, run, setData, setError };
}
