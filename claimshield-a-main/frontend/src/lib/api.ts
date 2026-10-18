/** Same-origin API client. Mirrors the server's CSRF/identity contract (claimshield/api/auth.py):
 * every request carries `X-ClaimShield-Request: 1` and browser credentials, and any sign of an
 * expired IAP session (401/403, a redirect, or an HTML login page) becomes an AuthError. */

export const AUTH_MESSAGE =
  "Your session has expired or access was denied. Reload this page to sign in through Google.";

export class AuthError extends Error {
  constructor() {
    super(AUTH_MESSAGE);
    this.name = "AuthError";
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type AuthListener = () => void;
const authListeners = new Set<AuthListener>();

/** Live streams register here so an auth failure anywhere closes them. */
export function onAuthFailure(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: { ...(options.headers as Record<string, string> | undefined), "X-ClaimShield-Request": "1" },
  });
  if (
    response.status === 401 ||
    response.status === 403 ||
    response.redirected ||
    (response.headers.get("content-type") || "").includes("text/html")
  ) {
    authListeners.forEach((l) => l());
    throw new AuthError();
  }
  return response;
}

function detail(body: unknown, fallback: string): string {
  const d = (body as { detail?: unknown } | null)?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length && typeof d[0]?.msg === "string") return d.map((x) => x.msg).join("; ");
  return fallback;
}

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(detail(body, fallback), response.status);
  return body as T;
}

export async function getJson<T>(url: string, fallback = "The request could not be completed."): Promise<T> {
  return parse<T>(await apiFetch(url), fallback);
}

export async function postForm<T>(url: string, form: FormData, fallback = "The request could not be completed."): Promise<T> {
  return parse<T>(await apiFetch(url, { method: "POST", body: form }), fallback);
}

export async function sendJson<T>(
  url: string,
  body: unknown,
  method: "POST" | "PUT" | "PATCH" = "POST",
  fallback = "The request could not be completed.",
): Promise<T> {
  return parse<T>(
    await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    fallback,
  );
}

export interface TraceEvent {
  seq: number;
  t: number;
  agent: string;
  kind: "start" | "tool" | "info" | "result" | "warn" | "error" | "done";
  message: string;
  detail?: Record<string, unknown>;
}

export interface TraceHandlers {
  onEvent: (event: TraceEvent) => void;
  /** The pipeline finished (or the case was already complete). */
  onEnd: () => void;
  onError: (message: string) => void;
}

/** Subscribe to a case's live agent trace. Returns a close function.
 * - `auth_expired` from the server, or any apiFetch auth failure, closes the stream.
 * - On a dropped connection EventSource retries by itself; if the case has meanwhile
 *   finished we end, and if it is unavailable we stop retrying. */
export function streamTrace(caseId: string, handlers: TraceHandlers): () => void {
  const source = new EventSource(`/api/cases/${encodeURIComponent(caseId)}/events`);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    source.close();
    unsubscribe();
  };
  const unsubscribe = onAuthFailure(close);

  source.onmessage = (msg: MessageEvent<string>) => {
    try {
      const event = JSON.parse(msg.data) as TraceEvent;
      if (event && typeof event.agent === "string") handlers.onEvent(event);
    } catch {
      /* ignore malformed frames */
    }
  };
  source.addEventListener("end", () => {
    close();
    handlers.onEnd();
  });
  source.addEventListener("auth_expired", () => {
    close();
    handlers.onError("Your session has expired. Reload this page to sign in through Google.");
  });
  source.onerror = () => {
    if (closed) return;
    apiFetch(`/api/cases/${encodeURIComponent(caseId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("This case is unavailable or you do not have access.");
        const c = (await r.json()) as { status?: string };
        if (c.status && c.status !== "running") {
          close();
          handlers.onEnd();
        }
      })
      .catch((error: Error) => {
        close();
        handlers.onError(error.message);
      });
  };
  return close;
}

export function downloadText(filename: string, text: string, type = "text/plain;charset=utf-8"): void {
  const blob = new Blob([text], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
