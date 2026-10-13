import { afterEach, describe, expect, it, vi } from "vitest";
import { EXPLANATIONS } from "@/content/explanations";
import { bundledKey, explanationState, visitorId } from "@/lib/explain/ondemand";
import { currentReports, filingsKey } from "@/lib/explain/sources";
import type { CompanyFilings, Filing } from "@/lib/sec/filings";
import { claim, listQueued, saveReady } from "@/lib/store/explanations";

const filing = (form: string, accessionNumber: string, filingDate: string) => ({ form, accessionNumber, filingDate }) as Filing;
const filings = (list: Filing[]) => ({ filings: list }) as unknown as CompanyFilings;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("which reports an explanation comes from", () => {
  it("uses the latest 10-K and a newer 10-Q", () => {
    const r = currentReports(
      filings([
        filing("10-Q", "0000000001-26-000020", "2026-08-01"),
        filing("10-K", "0000000001-25-000079", "2025-10-31"),
        filing("10-Q", "0000000001-25-000050", "2025-08-01"),
      ]),
    );
    expect(filingsKey(r)).toBe("0000000001-25-000079+0000000001-26-000020");
  });

  it("skips a 10-Q that is older than the 10-K", () => {
    const r = currentReports(
      filings([filing("10-K", "0000000001-25-000079", "2025-10-31"), filing("10-Q", "0000000001-25-000050", "2025-08-01")]),
    );
    expect(filingsKey(r)).toBe("0000000001-25-000079");
  });

  it("reads the same key back from a bundled explanation's links", () => {
    expect(bundledKey(EXPLANATIONS.AAPL)).toBe("0000320193-25-000079+0000320193-26-000020");
    for (const e of Object.values(EXPLANATIONS)) expect(bundledKey(e)).toMatch(/^\d{10}-\d{2}-\d{6}/);
  });
});

describe("visitor fingerprint", () => {
  it("is stable, short and doesn't contain the address", () => {
    const a = visitorId("203.0.113.5", "Mozilla");
    expect(a).toBe(visitorId("203.0.113.5", "Mozilla"));
    expect(a).not.toBe(visitorId("203.0.113.6", "Mozilla"));
    expect(a).toHaveLength(32);
    expect(a).not.toContain("203");
  });
});

describe("Supabase store", () => {
  function mockFetch(reply: unknown) {
    const fn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(reply), { status: 200 }));
    vi.stubGlobal("fetch", fn);
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co/");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    return fn;
  }

  it("sends the secret key in the apikey header and calls the claim function", async () => {
    const fn = mockFetch("claimed");
    const result = await claim({ ticker: "AAPL", filingsKey: "k", dailyLimit: 6, visitor: "v" });
    expect(result).toBe("claimed");
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.supabase.co/rest/v1/rpc/claim_explanation");
    expect((init.headers as Record<string, string>).apikey).toBe("sb_secret_test");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(JSON.parse(init.body as string)).toMatchObject({ p_ticker: "AAPL", p_daily_limit: 6, p_visitor: "v" });
  });

  it("saves a finished explanation and resets the attempt count", async () => {
    const fn = mockFetch(null);
    await saveReady("BRK-B", EXPLANATIONS.AAPL, "k");
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("explanations?ticker=eq.BRK-B");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toMatchObject({ status: "ready", filings_key: "k", queued: false, attempts: 0 });
  });

  it("lists queued and stuck companies", async () => {
    const fn = mockFetch([]);
    await listQueued(3);
    const [url] = fn.mock.calls[0] as [string];
    expect(url).toContain("or=(queued.is.true,and(status.eq.working,updated_at.lt.");
    expect(url).toContain("limit=3");
  });

  it("marks an explanation out of date when a newer report exists", async () => {
    mockFetch([{ ticker: "XYZ", status: "ready", data: EXPLANATIONS.AAPL, filings_key: "old", queued: false, attempts: 1, last_error: null, updated_at: "2026-01-01T00:00:00Z" }]);
    const state = await explanationState("XYZ", "new");
    expect(state).toMatchObject({ status: "ready", stale: true });
  });

  it("falls back to the bundled explanation when the database can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    const state = await explanationState("AAPL", bundledKey(EXPLANATIONS.AAPL));
    expect(state.status).toBe("ready");
    expect(state.explanation?.ticker).toBe("AAPL");
    expect(state.stale).toBe(false);
  });

  it("works without Supabase: bundled companies are ready, others unavailable", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    expect((await explanationState("AAPL")).status).toBe("ready");
    expect((await explanationState("ZZZZ")).status).toBe("unavailable");
  });
});
