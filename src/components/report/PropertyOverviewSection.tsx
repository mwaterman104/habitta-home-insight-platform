import type { ReportProperty } from '@/hooks/useHomeReport';

interface PropertyOverviewSectionProps {
  property: ReportProperty | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">
        {value ?? 'Not available'}
      </span>
    </div>
  );
}

export function PropertyOverviewSection({ property }: PropertyOverviewSectionProps) {
  if (!property) return null;

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`;

  return (
    <section className="space-y-3">
      <h2 className="heading-h3 text-foreground">Property Overview</h2>
      <div className="bg-card rounded-lg border border-border p-4">
        <Field label="Address" value={fullAddress} />
        <Field label="Year built" value={property.yearBuilt} />
        <Field
          label="Square footage"
          value={property.squareFeet ? `${property.squareFeet.toLocaleString()} sq ft` : null}
        />
        <Field label="Bedrooms" value={property.bedrooms} />
        <Field label="Bathrooms" value={property.bathrooms} />
        <Field
          label="Property type"
          value={property.propertyType
            ? property.propertyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            : null}
        />
      </div>
    </section>
  );
}
