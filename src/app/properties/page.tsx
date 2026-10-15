import type { Metadata } from "next";
import PropertyCatalog from "./PropertyCatalog";

export const metadata: Metadata = {
  title: "Properties | Leadscale",
  description:
    "Browse fictional sample properties in the Leadscale demonstration catalog.",
};

export default function PropertiesPage() {
  return <PropertyCatalog />;
}
