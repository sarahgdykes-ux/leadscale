"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  filterProperties,
  propertyListings,
  PROPERTY_TYPES,
  type PropertyFilters,
} from "@/lib/properties";
import { PropertyArtwork } from "@/components/property/PropertyArtwork";

const priceFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function PropertiesPage() {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const cities = useMemo(
    () => [...new Set(propertyListings.map((property) => property.city))].sort(),
    [],
  );
  const visibleProperties = useMemo(
    () => filterProperties(propertyListings, filters),
    [filters],
  );

  function updateFilter<K extends keyof PropertyFilters>(
    field: K,
    value: PropertyFilters[K],
  ) {
    setFilters((current) => ({ ...current, [field]: value || undefined }));
  }

  function clearFilters() {
    setFilters({});
  }

  return (
    <main className="property-main">
      <section className="property-heading" aria-labelledby="properties-title">
        <p className="eyebrow">THE PROPERTY JOURNAL</p>
        <h1 id="properties-title">Find a place to call home.</h1>
        <div className="property-intro">
          <p>
            Browse a small collection of homes, townhouses, and apartments.
          </p>
          <span className="fictional-note">
            Fictional listings for demonstration only
          </span>
        </div>
      </section>

      <section className="property-filters" aria-labelledby="filter-heading">
        <div className="property-filter-heading">
          <div>
            <p className="eyebrow">REFINE YOUR SEARCH</p>
            <h2 id="filter-heading">A few useful details</h2>
          </div>
          <button
            className="property-clear"
            type="button"
            onClick={clearFilters}
            disabled={Object.values(filters).every((value) => !value)}
          >
            Clear filters
          </button>
        </div>
        <div className="property-filter-fields">
          <label>
            City
            <select
              value={filters.city ?? ""}
              onChange={(event) => updateFilter("city", event.target.value)}
            >
              <option value="">Any city</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <label>
            Property type
            <select
              value={filters.propertyType ?? ""}
              onChange={(event) =>
                updateFilter("propertyType", event.target.value)
              }
            >
              <option value="">Any type</option>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Minimum price
            <span className="price-input-wrap">
              <span aria-hidden="true">$</span>
              <input
                type="number"
                min="0"
                step="10000"
                inputMode="numeric"
                placeholder="No minimum"
                value={filters.minPrice ?? ""}
                onChange={(event) => updateFilter("minPrice", event.target.value)}
              />
            </span>
          </label>
          <label>
            Maximum price
            <span className="price-input-wrap">
              <span aria-hidden="true">$</span>
              <input
                type="number"
                min="0"
                step="10000"
                inputMode="numeric"
                placeholder="No maximum"
                value={filters.maxPrice ?? ""}
                onChange={(event) => updateFilter("maxPrice", event.target.value)}
              />
            </span>
          </label>
        </div>
      </section>

      <section className="property-results" aria-labelledby="results-heading">
        <div className="property-results-heading">
          <div>
            <p className="eyebrow">FICTIONAL HOMES ACROSS FOUR CITIES</p>
            <h2 id="results-heading">Homes to explore</h2>
          </div>
          <p aria-live="polite">
            {visibleProperties.length}{" "}
            {visibleProperties.length === 1 ? "property" : "properties"}
          </p>
        </div>
        {visibleProperties.length ? (
          <ul className="property-grid">
            {visibleProperties.map((property) => (
              <li className="property-card" key={property.id}>
                <Link
                  className="property-card-link"
                  href={`/properties/${property.id}`}
                >
                  <PropertyArtwork style={property.style} />
                  <div className="property-card-body">
                    <div className="property-card-topline">
                      <span>{property.propertyType}</span>
                      <span>Sample listing</span>
                    </div>
                    <p className="property-card-price">
                      {priceFormat.format(property.price)}
                    </p>
                    <h3>{property.address}</h3>
                    <p className="property-card-city">{property.city}</p>
                    <p className="property-card-specs">
                      {property.bedrooms} beds
                      <span aria-hidden="true">·</span>
                      {property.bathrooms} baths
                      <span aria-hidden="true">·</span>
                      {property.squareFeet.toLocaleString("en-US")} sq ft
                    </p>
                    <span className="property-card-cta">
                      View property <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="property-empty">
            <p className="eyebrow">NO MATCHES THIS TIME</p>
            <h3>Try opening up your search.</h3>
            <p>Adjust the city, type, or price range to see more homes.</p>
            <button className="property-clear" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
