import { describe, expect, it } from "vitest";
import {
  filterProperties,
  getPropertyById,
  propertyListings,
} from "../src/lib/properties";

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
        minPrice: "900000",
        maxPrice: "1000000",
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
});
