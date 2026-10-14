import { LeadSchema, type Lead } from "../types/lead";
import {
  fixtureLeads,
  fixturePrioritizeResult,
  PrioritizeResultSchema,
  type PrioritizeResult,
} from "./fixtures";
import { ROUTE_SECURITY_CONFIG } from "../security/config";
import { StatusApiResponseSchema } from "../types/status";

export class LeadClientError extends Error {
  constructor(
    message: string,
    readonly kind: "network" | "http" | "validation",
  ) {
    super(message);
    this.name = "LeadClientError";
  }
}

const useFixtures = process.env.NEXT_PUBLIC_USE_FIXTURES !== "false";

function validationMessage(
  resource: string,
  error: { issues: { message: string; path: PropertyKey[] }[] },
): string {
  const issue = error.issues[0];
  const field = issue?.path.map(String).join(".");
  return field
    ? `${resource} data did not match the lead contract at ${field}: ${issue.message}`
    : `${resource} data did not match the lead contract.`;
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new LeadClientError(
      "The lead service could not be reached. Check your connection and retry.",
      "network",
    );
  }

  if (!response.ok) {
    throw new LeadClientError(
      `The lead service returned an error (${response.status}).`,
      "http",
    );
  }

  try {
    return await response.json();
  } catch {
    throw new LeadClientError(
      "The lead service returned unreadable data. Please retry.",
      "validation",
    );
  }
}

export async function fetchPrioritized(leadIds?: readonly string[]): Promise<PrioritizeResult> {
  if (useFixtures) return fixturePrioritizeResult;

  const payload = await requestJson("/api/prioritize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadIds ? { leadIds } : {}),
  });
  const parsed = PrioritizeResultSchema.safeParse(payload);
  if (!parsed.success) {
    throw new LeadClientError(
      validationMessage("Prioritization", parsed.error),
      "validation",
    );
  }
  return parsed.data;
}

export async function fetchLeads(
  offset = 0,
  limit = ROUTE_SECURITY_CONFIG.maxPrioritizeLeads,
): Promise<{ leads: Lead[]; total: number; offset: number; limit: number }> {
  if (useFixtures) {
    return { leads: fixtureLeads.slice(offset, offset + limit), total: fixtureLeads.length, offset, limit };
  }

  let response: Response;
  try {
    response = await fetch(`/api/leads?offset=${offset}&limit=${limit}`);
  } catch {
    throw new LeadClientError("The lead service could not be reached. Check your connection and retry.", "network");
  }
  if (!response.ok) {
    throw new LeadClientError(`The lead service returned an error (${response.status}).`, "http");
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LeadClientError("The lead service returned unreadable data. Please retry.", "validation");
  }
  const parsed = LeadSchema.array().safeParse(payload);
  if (!parsed.success) {
    throw new LeadClientError(
      validationMessage("Lead list", parsed.error),
      "validation",
    );
  }
  return {
    leads: parsed.data,
    total: Number(response.headers.get("x-total-count") ?? parsed.data.length),
    offset,
    limit,
  };
}

export async function fetchServiceStatus() {
  const payload = await requestJson("/api/status");
  const parsed = StatusApiResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new LeadClientError(
      validationMessage("Service status", parsed.error),
      "validation",
    );
  }
  return parsed.data;
}
