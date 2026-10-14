import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AssessmentSchema, LeadSchema, type Lead } from "../types/lead";
import type {
  AssessmentToSave,
  IntakeEventStatus,
  LeadRepository,
  LeadSaveResult,
  OperationalCounts,
  PrioritizeRunSummary,
  RejectedLeadToSave,
  StoredAssessment,
} from "./leadRepository";
import { leadAssessmentInputHash, leadContentHash, leadDedupeKey } from "./leadHash";
import type { Database, Json } from "./supabaseDatabase.types";
import { INTAKE_LIMITS } from "../intake/config";

const SUPABASE_RESULT_PAGE_SIZE = 1_000;

function getClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase server configuration is missing.");
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function toJson(value: unknown): Json {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return null;
  return JSON.parse(serialized) as Json;
}

function rowForLead(lead: Lead, id = lead.id) {
  const storedLead = LeadSchema.parse({ ...lead, id });
  const leadPayload = Object.fromEntries(
    Object.entries(storedLead).filter(([key]) => !["email", "phone", "rawSourceData"].includes(key)),
  );
  return {
    id,
    source: storedLead.source,
    received_at: storedLead.receivedAt,
    name: storedLead.name,
    email: storedLead.email ?? null,
    phone: storedLead.phone ?? null,
    property: toJson(storedLead.property),
    budget: toJson(storedLead.budget),
    timeline: toJson(storedLead.timeline),
    message: storedLead.message,
    engagement: toJson(storedLead.engagement),
    lead: toJson(leadPayload),
    raw_source_data: toJson({}),
    content_hash: leadContentHash(storedLead),
    dedupe_key: leadDedupeKey(storedLead),
    updated_at: new Date().toISOString(),
  };
}

function leadFromRow(row: { lead: Json; email: string | null; phone: string | null }): Lead {
  return LeadSchema.parse({
    ...(typeof row.lead === "object" && row.lead !== null && !Array.isArray(row.lead) ? row.lead : {}),
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    rawSourceData: {},
  });
}

export class SupabaseLeadRepository implements LeadRepository {
  private readonly client: SupabaseClient<Database>;

  constructor(client?: SupabaseClient<Database>) {
    this.client = client ?? getClient();
  }

  async getById(id: string): Promise<Lead | null> {
    const { data, error } = await this.client.from("leads").select("lead, email, phone").eq("id", id).maybeSingle();
    if (error) throw new Error("Lead could not be retrieved from Supabase.");
    return data ? leadFromRow(data) : null;
  }

  async list(): Promise<Lead[]> {
    const { data, error } = await this.client.from("leads").select("lead, email, phone").order("received_at", { ascending: false });
    if (error) throw new Error("Leads could not be retrieved from Supabase.");
    return (data ?? []).map(leadFromRow);
  }

  async saveLeads(leads: readonly Lead[]): Promise<LeadSaveResult> {
    if (leads.length === 0) return { saved: 0, merged: 0, skipped: 0 };
    const uniqueById = new Map<string, Lead>();
    for (const candidate of leads) uniqueById.set(candidate.id, LeadSchema.parse(candidate));
    const uniqueLeads = [...uniqueById.values()];
    const ids = uniqueLeads.map((lead) => lead.id);
    const { data: existingRows, error: lookupError } = await this.client
      .from("leads")
      .select("id")
      .in("id", ids);
    if (lookupError) throw new Error("Existing lead IDs could not be checked.");
    const existingIds = new Set((existingRows ?? []).map((row) => row.id));
    const { error } = await this.client.from("leads").upsert(
      uniqueLeads.map((lead) => rowForLead(lead)),
      { onConflict: "id" },
    );
    if (error) throw new Error("Lead upsert failed.");
    return {
      saved: uniqueLeads.filter((lead) => !existingIds.has(lead.id)).length,
      merged: uniqueLeads.filter((lead) => existingIds.has(lead.id)).length,
      skipped: leads.length - uniqueLeads.length,
    };
  }

  async saveAssessments(assessments: readonly AssessmentToSave[]): Promise<void> {
    if (assessments.length === 0) return;
    const rows = assessments.map((item) => {
      const assessment = AssessmentSchema.parse(item.assessment);
      return {
        lead_id: item.leadId,
        assessment,
        score: assessment.score,
        priority: assessment.priority,
        confidence: assessment.confidence,
        source: item.source,
        prompt_version: item.promptVersion,
        adjustments: toJson(item.adjustments),
        flags: toJson(item.flags),
        input_hash: item.inputHash,
      };
    });
    const { error } = await this.client.from("assessments").insert(rows);
    if (error) throw new Error("Assessment persistence failed.");
  }

  async saveRejected(leads: readonly RejectedLeadToSave[]): Promise<void> {
    if (leads.length === 0) return;
    const rows = leads.map((item) => ({
      lead_id: item.leadId,
      raw: toJson(item.raw),
      reasons: toJson(item.reasons),
    }));
    const { error } = await this.client.from("rejected_leads").insert(rows);
    if (error) throw new Error("Rejected leads could not be persisted.");
  }

  async getLatestAssessments(leadIds: readonly string[]): Promise<Record<string, StoredAssessment>> {
    if (leadIds.length === 0) return {};
    const { data, error } = await this.client
      .from("assessments")
      .select("lead_id, assessment, source, prompt_version, adjustments, flags, input_hash, created_at")
      .in("lead_id", [...leadIds])
      .order("created_at", { ascending: false });
    if (error) throw new Error("Assessments could not be retrieved from Supabase.");
    const result: Record<string, StoredAssessment> = {};
    for (const row of data ?? []) {
      if (result[row.lead_id]) continue;
      const parsedAssessment = AssessmentSchema.parse(row.assessment);
      result[row.lead_id] = {
        leadId: row.lead_id,
        assessment: parsedAssessment,
        source: row.source,
        promptVersion: row.prompt_version,
        adjustments: Array.isArray(row.adjustments) ? row.adjustments.filter((item): item is string => typeof item === "string") : [],
        flags: Array.isArray(row.flags) ? row.flags.filter((item): item is string => typeof item === "string") : [],
        inputHash: row.input_hash,
        createdAt: row.created_at,
      };
    }
    return result;
  }

  async claimIntakeEvent(providerMessageId: string, source: string): Promise<boolean> {
    const { error } = await this.client.from("intake_events").insert({
      provider_message_id: providerMessageId,
      source,
      status: "pending",
      error: null,
      updated_at: new Date().toISOString(),
    });
    if (error?.code === "23505") {
      const { data, error: lookupError } = await this.client.from("intake_events")
        .select("status, updated_at")
        .eq("provider_message_id", providerMessageId)
        .maybeSingle();
      if (lookupError) throw new Error("Intake event status could not be retrieved.");
      if (!data) return false;
      const now = new Date();
      const retryFailed = data.status === "failed";
      const stalePending = data.status === "pending" &&
        now.getTime() - Date.parse(data.updated_at) >= INTAKE_LIMITS.pendingEventLeaseMs;
      if (!retryFailed && !stalePending) return false;
      let retry = this.client.from("intake_events")
        .update({ status: "pending", error: null, updated_at: now.toISOString() })
        .eq("provider_message_id", providerMessageId)
        .eq("status", data.status);
      if (stalePending) retry = retry.lt("updated_at", new Date(now.getTime() - INTAKE_LIMITS.pendingEventLeaseMs).toISOString());
      const { data: claimed, error: retryError } = await retry.select("id");
      if (retryError) throw new Error("Failed intake event could not be retried.");
      return (claimed?.length ?? 0) > 0;
    }
    if (error) throw new Error("Intake event could not be recorded.");
    return true;
  }

  async finishIntakeEvent(providerMessageId: string, status: IntakeEventStatus, message?: string): Promise<void> {
    const { error } = await this.client.from("intake_events")
      .update({ status, error: message ?? null, updated_at: new Date().toISOString() })
      .eq("provider_message_id", providerMessageId);
    if (error) throw new Error("Intake event status could not be updated.");
  }

  async savePrioritizeRun(summary: PrioritizeRunSummary): Promise<void> {
    const { error } = await this.client.from("prioritize_runs").insert({
      run_id: summary.runId,
      mode: summary.mode,
      prompt_version: summary.promptVersion,
      lead_count: summary.leadCount,
      scored_count: summary.scoredCount,
      rejected_count: summary.rejectedCount,
      fallback_count: summary.fallbackCount,
      validation_failure_count: summary.validationFailureCount,
      total_duration_ms: summary.totalDurationMs,
      p50_latency_ms: summary.p50LatencyMs,
      p95_latency_ms: summary.p95LatencyMs,
    });
    if (error) throw new Error("Prioritization run could not be persisted.");
  }

  async getOperationalCounts(): Promise<OperationalCounts> {
    const [leadQuery, rejectedQuery, runQuery] = await Promise.all([
      this.client.from("leads").select("id", { count: "exact", head: true }),
      this.client.from("rejected_leads").select("id", { count: "exact", head: true }),
      this.client.from("prioritize_runs").select("run_id", { count: "exact", head: true }),
    ]);
    if (leadQuery.error || rejectedQuery.error || runQuery.error) {
      throw new Error("Operational counts could not be retrieved.");
    }
    const assessmentRows: { lead_id: string; source: "agent" | "fallback"; created_at: string }[] = [];
    for (let offset = 0; ; offset += SUPABASE_RESULT_PAGE_SIZE) {
      const { data, error } = await this.client.from("assessments")
        .select("lead_id, source, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + SUPABASE_RESULT_PAGE_SIZE - 1);
      if (error) throw new Error("Operational assessment counts could not be retrieved.");
      const page = data ?? [];
      assessmentRows.push(...page);
      if (page.length < SUPABASE_RESULT_PAGE_SIZE) break;
    }
    const latestByLead = new Map<string, string>();
    for (const row of assessmentRows) {
      if (!latestByLead.has(row.lead_id)) latestByLead.set(row.lead_id, row.source);
    }
    return {
      leads: leadQuery.count ?? 0,
      scored: latestByLead.size,
      rejected: rejectedQuery.count ?? 0,
      fallback: [...latestByLead.values()].filter((source) => source === "fallback").length,
      runs: runQuery.count ?? 0,
    };
  }

  async deleteLead(id: string): Promise<void> {
    const { error: rejectedError } = await this.client.from("rejected_leads").delete().eq("lead_id", id);
    if (rejectedError) throw new Error("Lead rejection history could not be deleted.");
    const { error } = await this.client.from("leads").delete().eq("id", id);
    if (error) throw new Error("Lead could not be deleted.");
  }
}

export function assessmentHashForLead(lead: Lead, promptVersion: string): string {
  return leadAssessmentInputHash(lead, promptVersion);
}