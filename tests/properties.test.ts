import { describe, expect, it } from "vitest";
import {
  filterProperties,
  getPropertyById,
  propertyListings,
  recommendProperties,
} from "../src/lib/properties";
import { LeadSchema } from "../lib/types/lead";
import { fixturePrioritizeResult } from "../lib/client/fixtures";
import { seedLeads } from "../lib/data/seedLeads";

describe("fictional property catalog", () => {
  it("provides unique, complete sample property records", () => {
    expect(propertyListings.length).toBeGreaterThanOrEqual(6);
    expect(new Set(propertyListings.map((property) => property.id)).size).toBe(
      propertyListings.length,
    );
    for (const property of propertyListings) {
      expect(property.address).toBeTruthy();
      expect(property.city).toBeTruthy();
      expect(property.price).toBeGreaterThan(0);
      expect(property.features.length).toBeGreaterThan(0);
    }
  });

  it("filters by city, property type, and an inclusive price range", () => {
    const results = filterProperties(propertyListings, {
      city: "Austin",
      propertyType: "Condo",
      minPrice: "525000",
      maxPrice: "525000",
    });
    expect(results.map((property) => property.id)).toEqual(["olive-court-condo"]);
  });

  it("does not match listings outside the selected range", () => {
    expect(
      filterProperties(propertyListings, {
        minPrice: "1100000",
        maxPrice: "1200000",
      }),
    ).toEqual([]);
  });

  it("ignores invalid price input and returns undefined for unknown ids", () => {
    expect(
      filterProperties(propertyListings, { minPrice: "-1" }),
    ).toHaveLength(propertyListings.length);
    expect(getPropertyById("not-a-property")).toBeUndefined();
    expect(getPropertyById("wren-house")?.address).toBe("108 Wren House Lane");
  });

  it("recommends a matching fictional property to the first prioritized demo lead", () => {
    const firstLead = fixturePrioritizeResult.ranked[0]?.lead;
    expect(firstLead?.name).toBe("Maya Chen");
    const recommendations = firstLead
      ? recommendProperties(firstLead)
      : [];
    expect(recommendations[0]?.property.id).toBe("juniper-court-condo");
    expect(recommendations[0]?.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Brooklyn"),
        expect.stringContaining("Condo"),
        expect.stringContaining("$850,000–$1,050,000"),
      ]),
    );
  });

  it("recommends a catalog home that fits the strong Austin seed lead", () => {
    const strongLead = seedLeads.find((lead) => lead.id === "strong");
    expect(strongLead).toBeDefined();
    expect(
      strongLead && recommendProperties(strongLead)[0]?.property.id,
    ).toBe("wren-house");
  });

  it("matches property type aliases without treating a townhouse as a house", () => {
    const firstLead = fixturePrioritizeResult.ranked[0]?.lead;
    expect(firstLead).toBeDefined();
    if (!firstLead) return;
    const townhouseLead = LeadSchema.parse({
      ...firstLead,
      id: "townhouse-recommendation-test",
      property: { ...firstLead.property, city: "Austin", propertyType: "Townhouse" },
      budget: { min: 0, max: 1_000_000, currency: "USD" },
    });
    const townhome = propertyListings.find(
      (property) => property.propertyType === "Townhouse",
    );
    const house = propertyListings.find((property) => property.propertyType === "House");
    expect(townhome).toBeDefined();
    expect(house).toBeDefined();
    if (!townhome || !house) return;
    const matches = recommendProperties(townhouseLead, [
      { ...townhome, city: "Austin" },
      { ...house, city: "Austin" },
    ]);
    expect(matches.map((match) => match.property.propertyType)).toEqual([
      "Townhouse",
    ]);
  });

  it("does not recommend a property that exceeds a lead's stated budget", () => {
    const lead = fixturePrioritizeResult.ranked.find(
      (entry) => entry.lead.id === "lead-001",
    )?.lead;
    expect(lead).toBeDefined();
    expect(
      lead &&
        recommendProperties(lead, [
          {
            ...propertyListings[0]!,
            price: 1_100_000,
          },
        ]),
    ).toEqual([]);
  });
});
