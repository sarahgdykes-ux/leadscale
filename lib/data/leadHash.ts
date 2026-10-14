import { createHash } from "node:crypto";
import type { Lead } from "../types/lead";

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function hashValue(value: unknown): string {
  return hash(value);
}

export function leadContentHash(lead: Lead): string {
  return hash(lead);
}

export function leadAssessmentInputHash(lead: Lead, cacheContext: unknown): string {
  return hash({ lead, cacheContext });
}

export function leadDedupeKey(lead: Lead): string {
  return `id:${lead.id}`;
}