import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyArtwork } from "@/components/property/PropertyArtwork";
import { getPropertyById } from "@/lib/properties";

type PropertyDetailPageProps = {
  params: Promise<{ id: string }>;
};

const priceFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export async function generateMetadata({
  params,
}: PropertyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = getPropertyById(id);
  return {
    title: property
      ? `${property.address} | Fictional property`
      : "Property not found | Leadscale",
  };
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { id } = await params;
  const property = getPropertyById(id);
  if (!property) notFound();

  return (
    <main className="property-main property-detail-main">
      <Link className="property-back-link" href="/properties">
        <span aria-hidden="true">←</span> Back to all properties
      </Link>
      <div className="property-detail-layout">
        <PropertyArtwork
          style={property.style}
          className="property-detail-artwork"
        />
        <article className="property-detail-content">
          <p className="eyebrow">FICTIONAL SAMPLE LISTING</p>
          <p className="property-detail-price">
            {priceFormat.format(property.price)}
          </p>
          <h1>{property.address}</h1>
          <p className="property-detail-city">{property.city}</p>
          <div className="property-detail-facts" aria-label="Property facts">
            <span>
              <strong>{property.bedrooms}</strong> beds
            </span>
            <span>
              <strong>{property.bathrooms}</strong> baths
            </span>
            <span>
              <strong>{property.squareFeet.toLocaleString("en-US")}</strong> sq ft
            </span>
            <span>
              <strong>{property.yearBuilt}</strong> built
            </span>
          </div>
          <section className="property-detail-section">
            <h2>About this home</h2>
            <p>{property.description}</p>
          </section>
          <section className="property-detail-section">
            <h2>Highlights</h2>
            <ul className="property-feature-list">
              {property.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>
          <p className="property-disclaimer">
            This is fictional demonstration content. It is not an active listing
            and should not be used for a real estate decision.
          </p>
        </article>
      </div>
    </main>
  );
}
