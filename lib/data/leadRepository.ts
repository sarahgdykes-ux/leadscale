import { seedLeads } from "./seedLeads";
import { AssessmentSchema, LeadSchema, type Assessment, type Lead } from "../types/lead";
import { leadDedupeKey } from "./leadHash";
import { INTAKE_LIMITS } from "../intake/config";

export type AssessmentSource = "agent" | "fallback";

export type LeadSaveResult = { saved: number; merged: number; skipped: number };

export type AssessmentToSave = {
  leadId: string;
  assessment: Assessment;
  source: AssessmentSource;
  promptVersion: string;
  adjustments: string[];
  flags: string[];
  inputHash: string;
};

export type StoredAssessment = AssessmentToSave & { createdAt: string };

export type RejectedLeadToSave = {
  leadId: string;
  raw: Record<string, unknown>;
  reasons: string[];
};

export type IntakeEventStatus = "pending" | "processed" | "rejected" | "failed";

export type PrioritizeRunSummary = {
  runId: string;
  mode: "mock" | "live";
  promptVersion: string;
  leadCount: number;
  scoredCount: number;
  rejectedCount: number;
  fallbackCount: number;
  validationFailureCount: number;
  totalDurationMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
};

export type OperationalCounts = {
  leads: number;
  scored: number;
  rejected: number;
  fallback: number;
  runs: number;
};

export interface LeadRepository {
  getById(id: string): Promise<Lead | null>;
  list(): Promise<Lead[]>;
  saveLeads(leads: readonly Lead[]): Promise<LeadSaveResult>;
  saveAssessments(assessments: readonly AssessmentToSave[]): Promise<void>;
  saveRejected(leads: readonly RejectedLeadToSave[]): Promise<void>;
  getLatestAssessments(leadIds: readonly string[]): Promise<Record<string, StoredAssessment>>;
  claimIntakeEvent(providerMessageId: string, source: string): Promise<boolean>;
  finishIntakeEvent(providerMessageId: string, status: IntakeEventStatus, error?: string): Promise<void>;
  savePrioritizeRun(summary: PrioritizeRunSummary): Promise<void>;
  getOperationalCounts(): Promise<OperationalCounts>;
  deleteLead(id: string): Promise<void>;
}

export class InMemoryLeadRepository implements LeadRepository {
  private readonly leads: Lead[];
  private readonly assessments = new Map<string, StoredAssessment>();
  private readonly intakeEvents = new Map<string, { source: string; status: IntakeEventStatus; error?: string; updatedAt: number }>();
  private readonly rejected: RejectedLeadToSave[] = [];
  private readonly runs: PrioritizeRunSummary[] = [];

  constructor(leads: readonly unknown[] = seedLeads, private readonly now: () => Date = () => new Date()) {
    this.leads = leads.map((lead) => LeadSchema.parse(lead));
  }

  async getById(id: string): Promise<Lead | null> {
    const lead = this.leads.find((candidate) => candidate.id === id);
    return lead ? LeadSchema.parse(lead) : null;
  }

  async list(): Promise<Lead[]> {
    return this.leads.map((lead) => LeadSchema.parse(lead));
  }

  async saveLeads(leads: readonly Lead[]): Promise<LeadSaveResult> {
    const result: LeadSaveResult = { saved: 0, merged: 0, skipped: 0 };
    for (const candidate of leads) {
      const lead = LeadSchema.parse(candidate);
      const key = leadDedupeKey(lead);
      const existingIndex = this.leads.findIndex((saved) => leadDedupeKey(saved) === key);
      if (existingIndex < 0) {
        this.leads.push(lead);
        result.saved += 1;
        continue;
      }
      this.leads[existingIndex] = lead;
      result.merged += 1;
    }
    return result;
  }

  async saveAssessments(assessments: readonly AssessmentToSave[]): Promise<void> {
    for (const item of assessments) {
      const parsed = AssessmentSchema.parse(item.assessment);
      this.assessments.set(item.leadId, { ...item, assessment: parsed, createdAt: new Date().toISOString() });
    }
  }

  async saveRejected(leads: readonly RejectedLeadToSave[]): Promise<void> {
    this.rejected.push(...leads.map((item) => ({ ...item, reasons: [...item.reasons] })));
  }

  async getLatestAssessments(leadIds: readonly string[]): Promise<Record<string, StoredAssessment>> {
    const result: Record<string, StoredAssessment> = {};
    for (const leadId of leadIds) {
      const assessment = this.assessments.get(leadId);
      if (assessment) result[leadId] = { ...assessment, assessment: AssessmentSchema.parse(assessment.assessment) };
    }
    return result;
  }

  async claimIntakeEvent(providerMessageId: string, source: string): Promise<boolean> {
    const now = this.now().getTime();
    const existing = this.intakeEvents.get(providerMessageId);
    const retryable = existing?.status === "failed" || (
      existing?.status === "pending" && now - existing.updatedAt >= INTAKE_LIMITS.pendingEventLeaseMs
    );
    if (existing && !retryable) return false;
    this.intakeEvents.set(providerMessageId, { source, status: "pending", updatedAt: now });
    return true;
  }

  async finishIntakeEvent(providerMessageId: string, status: IntakeEventStatus, error?: string): Promise<void> {
    const event = this.intakeEvents.get(providerMessageId);
    if (!event) return;
    this.intakeEvents.set(providerMessageId, {
      ...event,
      status,
      updatedAt: this.now().getTime(),
      ...(error ? { error } : {}),
    });
  }

  async savePrioritizeRun(summary: PrioritizeRunSummary): Promise<void> {
    this.runs.push({ ...summary });
  }

  async getOperationalCounts(): Promise<OperationalCounts> {
    const latestAssessments = [...this.assessments.values()];
    return {
      leads: this.leads.length,
      scored: latestAssessments.length,
      rejected: this.rejected.length,
      fallback: latestAssessments.filter((item) => item.source === "fallback").length,
      runs: this.runs.length,
    };
  }

  async deleteLead(id: string): Promise<void> {
    const index = this.leads.findIndex((lead) => lead.id === id);
    if (index >= 0) this.leads.splice(index, 1);
    this.assessments.delete(id);
    for (let rejectedIndex = this.rejected.length - 1; rejectedIndex >= 0; rejectedIndex -= 1) {
      if (this.rejected[rejectedIndex]?.leadId === id) this.rejected.splice(rejectedIndex, 1);
    }
  }
}