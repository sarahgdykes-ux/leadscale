import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { scoreLead } from "../../agent/scoring";
import { filterLead } from "../../filtering/leadFilter";
import {
  BudgetSchema,
  EngagementSchema,
  LeadSourceSchema,
  PropertySchema,
  TimelineSchema,
} from "../../types/lead";
import type { LeadRepository } from "../../data/leadRepository";

export const GetLeadInputSchema = z.object({ leadId: z.string().trim().min(1) }).strict();

const SanitizedLeadSchema = z.object({
  id: z.string().trim().min(1),
  source: LeadSourceSchema,
  receivedAt: z.string().datetime({ offset: true }),
  hasEmail: z.boolean(),
  hasPhone: z.boolean(),
  property: PropertySchema,
  budget: BudgetSchema,
  timeline: TimelineSchema,
  message: z.string(),
  engagement: EngagementSchema,
}).strict();
const ScoreFactorSchema = z.object({ factor: z.string(), points: z.number(), note: z.string() }).strict();

export const GetLeadOutputSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not_found"), leadId: z.string() }).strict(),
  z.object({
    status: z.literal("found"),
    lead: SanitizedLeadSchema,
    flags: z.array(z.string()),
    preScore: z.number().int().min(0).max(100),
    breakdown: z.array(ScoreFactorSchema),
  }).strict(),
]);

export type GetLeadOutput = z.infer<typeof GetLeadOutputSchema>;

export const GET_LEAD_DEFAULT_MAX_CHARS = 4000;

export type GetLeadToolOptions = {
  repository: LeadRepository;
  allowedLeadId?: string;
  maxMessageChars?: number;
  now?: () => string;
};

function positiveLimit(value: number | undefined): number {
  return Number.isInteger(value) && value !== undefined && value > 0
    ? value
    : GET_LEAD_DEFAULT_MAX_CHARS;
}

function wrapUntrusted(value: string | undefined, tag: string, maxChars = Number.POSITIVE_INFINITY): string | undefined {
  if (value === undefined) return undefined;
  const safeValue = value.replace(new RegExp(`<\\/?${tag}\\s*>`, "gi"), `[${tag} tag]`).slice(0, maxChars);
  return `<${tag}>${safeValue}</${tag}>`;
}

/** The Strands agent calls this read-only tool to retrieve one lead for assessment. */
export function createGetLeadTool(options: GetLeadToolOptions) {
  const maxMessageChars = positiveLimit(options.maxMessageChars);

  return tool({
    name: "get_lead",
    description: "Retrieve one lead by id, with its filter flags and deterministic score breakdown.",
    inputSchema: GetLeadInputSchema,
    callback: async ({ leadId }) => {
      if (options.allowedLeadId !== undefined && leadId !== options.allowedLeadId) {
        return GetLeadOutputSchema.parse({ status: "not_found", leadId });
      }
      const lead = await options.repository.getById(leadId);
      if (!lead) return GetLeadOutputSchema.parse({ status: "not_found", leadId });

      const allLeads = await options.repository.list();
      const filtered = filterLead(lead, { now: options.now?.() ?? new Date().toISOString(), batch: allLeads });
      const flags = filtered.status === "flagged"
        ? filtered.flags
        : filtered.status === "rejected"
          ? filtered.reasons
          : [];
      const scoring = scoreLead(lead, flags);
      // rawSourceData contains intake metadata, which is unnecessary for assessment and may include PII.
      const safeLead = {
        id: lead.id,
        source: lead.source,
        receivedAt: lead.receivedAt,
        hasEmail: Boolean(lead.email),
        hasPhone: Boolean(lead.phone),
        property: {
          ...lead.property,
          ...(lead.property.address ? { address: wrapUntrusted(lead.property.address, "lead_address") } : {}),
          ...(lead.property.city ? { city: wrapUntrusted(lead.property.city, "lead_city") } : {}),
          ...(lead.property.propertyType ? { propertyType: wrapUntrusted(lead.property.propertyType, "lead_property_type") } : {}),
        },
        budget: lead.budget,
        timeline: lead.timeline,
        message: lead.message,
        engagement: lead.engagement,
      };
      const output = {
        status: "found" as const,
        lead: { ...safeLead, message: wrapUntrusted(lead.message, "lead_message", maxMessageChars) ?? "<lead_message></lead_message>" },
        flags,
        preScore: scoring.score,
        breakdown: scoring.breakdown,
      };
      return GetLeadOutputSchema.parse(output);
    },
  });
}