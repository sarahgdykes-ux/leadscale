import { describe, expect, it } from "vitest";
import { AssessmentSchema, LeadSchema, priorityFromScore } from "../lib/types/lead";
import { seedLeads } from "../lib/data/seedLeads";

describe("active lead contract", () => {
  it("accepts all six current seed leads", () => {
    expect(LeadSchema.array().parse(seedLeads)).toHaveLength(6);
  });

  it("requires at least one contact method", () => {
    const leadWithoutContact = { ...seedLeads[0], email: undefined, phone: undefined };
    expect(LeadSchema.safeParse(leadWithoutContact).success).toBe(false);
  });

  it("restricts sources to values accepted by the database", () => {
    expect(LeadSchema.safeParse({ ...seedLeads[0], source: "future-adapter" }).success).toBe(false);
  });
});

describe("active assessment contract", () => {
  it("accepts the frozen assessment shape and aligns priorities with score bands", () => {
    expect(AssessmentSchema.safeParse({
      score: 85,
      priority: "URGENT",
      reasons: ["Budget fits the property.", "The lead requested a tour."],
      recommendedAction: "The assigned agent should confirm a tour today.",
      missingInformation: [],
      confidence: "HIGH",
    }).success).toBe(true);
    expect(priorityFromScore(85)).toBe("URGENT");
  });
});