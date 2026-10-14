import { afterEach, describe, expect, it } from "vitest";
import { GET as healthGet } from "../../src/app/api/health/route";
import { GET as statusGet } from "../../src/app/api/status/route";
import { GET as leadsGet } from "../../src/app/api/leads/route";
import { GET as leadDetailGet } from "../../src/app/api/leads/[id]/route";
import { POST as prioritizePost } from "../../src/app/api/prioritize/route";
import { POST as csvPost } from "../../src/app/api/intake/csv/route";
import { POST as manualPost } from "../../src/app/api/intake/manual/route";
import { POST as emailPost } from "../../src/app/api/intake/email/route";
import { seedLeads } from "../../lib/data/seedLeads";
import { getLeadRepository } from "../../lib/data";
import {
  ApiErrorResponseSchema,
  HealthApiResponseSchema,
  IntakeApiResponseSchema,
  LeadDetailResponseSchema,
  LeadListResponseSchema,
  PrioritizeApiResponseSchema,
  StatusApiResponseSchema,
} from "../../lib/types/api";

const originalEnvironment = {
  backend: process.env.DATA_BACKEND,
  mode: process.env.AGENT_MODE,
  routeSecret: process.env.ROUTE_SHARED_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET,
};

afterEach(() => {
  if (originalEnvironment.backend === undefined) delete process.env.DATA_BACKEND;
  else process.env.DATA_BACKEND = originalEnvironment.backend;
  if (originalEnvironment.mode === undefined) delete process.env.AGENT_MODE;
  else process.env.AGENT_MODE = originalEnvironment.mode;
  if (originalEnvironment.routeSecret === undefined) delete process.env.ROUTE_SHARED_SECRET;
  else process.env.ROUTE_SHARED_SECRET = originalEnvironment.routeSecret;
  if (originalEnvironment.resendApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalEnvironment.resendApiKey;
  if (originalEnvironment.resendWebhookSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
  else process.env.RESEND_WEBHOOK_SECRET = originalEnvironment.resendWebhookSecret;
});

function request(url: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${url}`, init);
}

describe("public and lead API contracts", () => {
  it("validates health, status, and lead-list responses", async () => {
    process.env.DATA_BACKEND = "memory";
    process.env.AGENT_MODE = "mock";
    const health = await healthGet();
    const status = await statusGet();
    const leads = await leadsGet(request("/api/leads"));
    const leadsPayload: unknown = await leads.json();
    expect(HealthApiResponseSchema.safeParse(await health.json()).success).toBe(true);
    expect(StatusApiResponseSchema.safeParse(await status.json()).success).toBe(true);
    expect(LeadListResponseSchema.safeParse(leadsPayload).success).toBe(true);
    const safeLeads = LeadListResponseSchema.parse(leadsPayload);
    expect(safeLeads.every((lead) => Object.keys(lead.rawSourceData).length === 0)).toBe(true);
  });

  it("returns bounded lead pages with a total count", async () => {
    process.env.DATA_BACKEND = "memory";
    delete process.env.ROUTE_SHARED_SECRET;
    const response = await leadsGet(request("/api/leads?offset=1&limit=2"));
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(2);
    expect(response.headers.get("x-total-count")).toBe("6");
    expect(response.headers.get("x-page-offset")).toBe("1");

    const invalid = await leadsGet(request("/api/leads?offset=0&limit=13"));
    expect(invalid.status).toBe(400);
  });

  it("returns repository-backed detail for non-UUID lead IDs", async () => {
    process.env.DATA_BACKEND = "memory";
    delete process.env.ROUTE_SHARED_SECRET;
    const id = seedLeads[0]?.id;
    if (!id) throw new Error("Lead fixture is missing.");
    const response = await leadDetailGet(request(`/api/leads/${id}`), { params: Promise.resolve({ id }) });
    expect(LeadDetailResponseSchema.safeParse(await response.json()).success).toBe(true);
    const missing = await leadDetailGet(request("/api/leads/not-a-uuid"), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(missing.status).toBe(404);
    expect(ApiErrorResponseSchema.safeParse(await missing.json()).success).toBe(true);
  });

  it("validates successful and error prioritize responses", async () => {
    process.env.DATA_BACKEND = "memory";
    process.env.AGENT_MODE = "mock";
    const success = await prioritizePost(request("/api/prioritize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadIds: ["strong"] }),
    }));
    const failure = await prioritizePost(request("/api/prioritize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }));
    expect(PrioritizeApiResponseSchema.safeParse(await success.json()).success).toBe(true);
    expect(ApiErrorResponseSchema.safeParse(await failure.json()).success).toBe(true);
  });

  it("validates manual, CSV, and unsigned email intake responses", async () => {
    process.env.DATA_BACKEND = "memory";
    const manual = await manualPost(request("/api/intake/manual", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Contract Buyer", email: "contract@example.test", message: "Please contact me." }),
    }));
    const csv = await csvPost(request("/api/intake/csv", {
      method: "POST",
      headers: { "content-type": "text/csv" },
      body: "Name,Email,Message\nCSV Buyer,csv-contract@example.test,Please call.",
    }));
    const email = await emailPost(request("/api/intake/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "email.received", data: { email_id: "unsigned-contract-test", from: "test@example.test" } }),
    }));
    expect(IntakeApiResponseSchema.safeParse(await manual.json()).success).toBe(true);
    expect(IntakeApiResponseSchema.safeParse(await csv.json()).success).toBe(true);
    expect(ApiErrorResponseSchema.safeParse(await email.json()).success).toBe(true);
  });

  it("rejects manual lead arrays above the configured batch limit", async () => {
    process.env.DATA_BACKEND = "memory";
    delete process.env.ROUTE_SHARED_SECRET;
    const manual = await manualPost(request("/api/intake/manual", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Array.from({ length: 1_001 }, () => ({}))),
    }));
    expect(manual.status).toBe(413);
    expect(await manual.json()).toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
  });

  it("reports a missing Resend API key as webhook configuration failure", async () => {
    process.env.DATA_BACKEND = "memory";
    process.env.RESEND_WEBHOOK_SECRET = "test-webhook-secret";
    delete process.env.RESEND_API_KEY;
    const response = await emailPost(request("/api/intake/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "svix-id": "event-missing-resend-key",
        "svix-timestamp": "1791979200",
        "svix-signature": "v1,signed",
      },
      body: JSON.stringify({ type: "email.received", data: { email_id: "missing-key", from: "sender@example.test" } }),
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "WEBHOOK_NOT_CONFIGURED" } });
  });

  it("provides mock-only empty, error, slow, and fallback UI states", async () => {
    process.env.DATA_BACKEND = "memory";
    process.env.AGENT_MODE = "mock";
    const empty = await leadsGet(request("/api/leads?simulate=empty"));
    const failed = await leadsGet(request("/api/leads?simulate=error"));
    const slowStart = Date.now();
    const slow = await leadsGet(request("/api/leads?simulate=slow"));
    const fallback = await prioritizePost(request("/api/prioritize?simulate=fallback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadIds: ["strong"] }),
    }));
    expect(LeadListResponseSchema.safeParse(await empty.json()).success).toBe(true);
    expect(ApiErrorResponseSchema.safeParse(await failed.json()).success).toBe(true);
    expect(slow.ok).toBe(true);
    expect(Date.now() - slowStart).toBeGreaterThanOrEqual(1_000);
    const result = PrioritizeApiResponseSchema.parse(await fallback.json());
    expect(result.meta[0]?.source).toBe("fallback");
  });

  it("does not persist simulated fallback assessments", async () => {
    process.env.DATA_BACKEND = "memory";
    process.env.AGENT_MODE = "mock";
    delete process.env.ROUTE_SHARED_SECRET;
    const repository = getLeadRepository();
    const simulationLead = {
      ...seedLeads[1]!,
      id: "simulation-cache-regression",
      email: "simulation-cache-regression@example.test",
    };
    await repository.saveLeads([simulationLead]);
    expect((await repository.getLatestAssessments([simulationLead.id]))[simulationLead.id]).toBeUndefined();

    const simulated = await prioritizePost(request("/api/prioritize?simulate=fallback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadIds: [simulationLead.id] }),
    }));
    expect(PrioritizeApiResponseSchema.parse(await simulated.json()).meta[0]?.source).toBe("fallback");
    expect((await repository.getLatestAssessments([simulationLead.id]))[simulationLead.id]).toBeUndefined();

    const normal = await prioritizePost(request("/api/prioritize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadIds: [simulationLead.id] }),
    }));
    expect(PrioritizeApiResponseSchema.parse(await normal.json()).meta[0]?.source).toBe("agent");
  });
});