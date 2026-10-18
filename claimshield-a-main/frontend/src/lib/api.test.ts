// Ported from tests/test_browser_auth.cjs: the same IAP/CSRF client guarantees, now against the
// React API client.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, apiFetch, streamTrace } from "./api";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  handlers: Record<string, () => void> = {};
  onmessage: ((m: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(name: string, fn: () => void) {
    this.handlers[name] = fn;
  }
  close() {
    this.closed = true;
  }
}

function respond(init: { status?: number; ok?: boolean; redirected?: boolean; contentType?: string; body?: unknown }) {
  const status = init.status ?? 200;
  return {
    status,
    ok: init.ok ?? (status >= 200 && status < 300),
    redirected: init.redirected ?? false,
    headers: { get: () => init.contentType ?? "application/json" },
    json: async () => init.body ?? {},
  } as unknown as Response;
}

const handlers = () => ({ onEvent: vi.fn(), onEnd: vi.fn(), onError: vi.fn() });

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
});
afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("keeps the protection header and same-origin credentials", async () => {
    const fetch = vi.fn().mockResolvedValue(respond({}));
    vi.stubGlobal("fetch", fetch);
    await apiFetch("/api/audit", { method: "POST", headers: { Custom: "value" } });
    const [, options] = fetch.mock.calls[0];
    expect(options.credentials).toBe("same-origin");
    expect(options.headers["X-ClaimShield-Request"]).toBe("1");
    expect(options.headers.Custom).toBe("value");
  });

  for (const failure of [401, 403, "redirect", "login-html"] as const) {
    it(`auth failure ${failure} closes the stream and asks the user to sign in`, async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          respond({
            status: typeof failure === "number" ? failure : 200,
            redirected: failure === "redirect",
            contentType: failure === "login-html" ? "text/html" : "application/json",
          }),
        ),
      );
      streamTrace("case-example", handlers());
      await expect(apiFetch("/api/cases/case-example")).rejects.toThrow(/Reload this page/);
      await expect(apiFetch("/api/cases/case-example")).rejects.toBeInstanceOf(AuthError);
      expect(FakeEventSource.instances[0].closed).toBe(true);
    });
  }
});

describe("streamTrace", () => {
  it("closes on the server's auth_expired event and reports expiry", () => {
    const h = handlers();
    streamTrace("case-example", h);
    FakeEventSource.instances[0].handlers.auth_expired();
    expect(FakeEventSource.instances[0].closed).toBe(true);
    expect(h.onError).toHaveBeenCalledWith(expect.stringMatching(/expired/));
  });

  it("stops retrying when the case is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond({ status: 404, ok: false })));
    const h = handlers();
    streamTrace("case-example", h);
    FakeEventSource.instances[0].onerror!();
    await new Promise((r) => setTimeout(r, 0));
    expect(FakeEventSource.instances[0].closed).toBe(true);
    expect(h.onError).toHaveBeenCalledWith(expect.stringMatching(/unavailable/));
  });

  it("ends instead of retrying when the case finished meanwhile", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond({ body: { status: "complete" } })));
    const h = handlers();
    streamTrace("case-example", h);
    FakeEventSource.instances[0].onerror!();
    await new Promise((r) => setTimeout(r, 0));
    expect(FakeEventSource.instances[0].closed).toBe(true);
    expect(h.onEnd).toHaveBeenCalled();
  });

  it("forwards trace events and ends on the end event", () => {
    const h = handlers();
    streamTrace("case-example", h);
    const es = FakeEventSource.instances[0];
    es.onmessage!({ data: JSON.stringify({ seq: 0, t: 0, agent: "intake_agent", kind: "start", message: "go" }) } as MessageEvent);
    es.onmessage!({ data: "not json" } as MessageEvent);
    es.handlers.end();
    expect(h.onEvent).toHaveBeenCalledTimes(1);
    expect(h.onEnd).toHaveBeenCalledTimes(1);
    expect(es.closed).toBe(true);
  });
});
