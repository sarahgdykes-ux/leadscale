import Link from "next/link";

export default function PropertyNotFound() {
  return (
    <main className="property-main property-not-found">
      <p className="eyebrow">PROPERTY NOT FOUND</p>
      <h1>That listing isn’t in this collection.</h1>
      <p>It may have moved, or the property address may not be valid.</p>
      <Link className="property-back-link" href="/properties">
        <span aria-hidden="true">←</span> Return to the property catalog
      </Link>
    </main>
  );
}
