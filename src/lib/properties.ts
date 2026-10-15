export const PROPERTY_TYPES = [
  "House",
  "Townhouse",
  "Condo",
  "Cottage",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PropertyStyle = "bungalow" | "modern" | "townhouse" | "condo";

export type PropertyListing = {
  id: string;
  address: string;
  city: string;
  propertyType: PropertyType;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  description: string;
  features: string[];
  style: PropertyStyle;
};

export const propertyListings: PropertyListing[] = [
  {
    id: "wren-house",
    address: "108 Wren House Lane",
    city: "Austin",
    propertyType: "House",
    price: 645000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1840,
    yearBuilt: 2018,
    description:
      "A light-filled home with a shaded front porch, an open living area, and a quiet garden patio.",
    features: ["Covered porch", "Garden patio", "Open-plan kitchen"],
    style: "bungalow",
  },
  {
    id: "juniper-cottage",
    address: "24 Juniper Hollow",
    city: "Austin",
    propertyType: "Cottage",
    price: 428000,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1260,
    yearBuilt: 2015,
    description:
      "A compact, warm cottage with a bright breakfast nook and a flexible room for work or guests.",
    features: ["Breakfast nook", "Flexible office", "Native garden"],
    style: "bungalow",
  },
  {
    id: "mesa-modern",
    address: "705 Mesa View Drive",
    city: "Austin",
    propertyType: "House",
    price: 795000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2360,
    yearBuilt: 2022,
    description:
      "A contemporary two-story home with generous windows, a calm palette, and an upstairs retreat.",
    features: ["Two living areas", "Large windows", "Two-car garage"],
    style: "modern",
  },
  {
    id: "bluebonnet-townhomes",
    address: "316 Bluebonnet Row",
    city: "Round Rock",
    propertyType: "Townhouse",
    price: 389000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1580,
    yearBuilt: 2020,
    description:
      "An easy-to-maintain townhome with a sunny upper-level landing and a private courtyard.",
    features: ["Private courtyard", "Attached garage", "End-unit layout"],
    style: "townhouse",
  },
  {
    id: "willow-condo",
    address: "502 Willow Glass Way, Unit 4B",
    city: "Round Rock",
    propertyType: "Condo",
    price: 315000,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1120,
    yearBuilt: 2021,
    description:
      "A bright corner residence with a balcony, a practical split-bedroom layout, and shared green space.",
    features: ["Private balcony", "Corner unit", "Shared garden"],
    style: "condo",
  },
  {
    id: "hearthstone-house",
    address: "82 Hearthstone Bend",
    city: "Cedar Park",
    propertyType: "House",
    price: 572000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1765,
    yearBuilt: 2017,
    description:
      "A single-level home with a welcoming central living room and a tucked-away reading corner.",
    features: ["Single-level plan", "Reading nook", "Covered back patio"],
    style: "bungalow",
  },
  {
    id: "copperline-townhouse",
    address: "11 Copperline Walk",
    city: "Cedar Park",
    propertyType: "Townhouse",
    price: 455000,
    bedrooms: 3,
    bathrooms: 3,
    squareFeet: 1690,
    yearBuilt: 2023,
    description:
      "A newly built townhome with a flexible ground-floor room and a private rooftop terrace.",
    features: ["Rooftop terrace", "Flexible ground floor", "Energy-smart design"],
    style: "townhouse",
  },
  {
    id: "olive-court-condo",
    address: "209 Olive Court, Unit 12",
    city: "Austin",
    propertyType: "Condo",
    price: 525000,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1380,
    yearBuilt: 2019,
    description:
      "A spacious condo with a deep balcony, a dedicated dining area, and leafy courtyard views.",
    features: ["Deep balcony", "Dining area", "Courtyard views"],
    style: "condo",
  },
];

export type PropertyFilters = {
  city?: string;
  propertyType?: string;
  minPrice?: string;
  maxPrice?: string;
};

function parsePrice(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function filterProperties(
  properties: readonly PropertyListing[],
  filters: PropertyFilters = {},
): PropertyListing[] {
  const minPrice = parsePrice(filters.minPrice);
  const maxPrice = parsePrice(filters.maxPrice);

  return properties.filter((property) => {
    if (filters.city && property.city !== filters.city) return false;
    if (
      filters.propertyType &&
      property.propertyType !== filters.propertyType
    ) {
      return false;
    }
    if (minPrice !== undefined && property.price < minPrice) return false;
    if (maxPrice !== undefined && property.price > maxPrice) return false;
    return true;
  });
}

export function getPropertyById(id: string): PropertyListing | undefined {
  return propertyListings.find((property) => property.id === id);
}
