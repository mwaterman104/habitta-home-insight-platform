import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyHistory } from '@/lib/propertyAPI';

interface PropertyDetailsProps {
  propertyData?: PropertyHistory;
  propertyType?: string;
  lotSize?: string;
  foundation?: string;
  exteriorWalls?: string;
  roofing?: string;
  yearBuilt?: number;
  yearBuiltEffective?: number;
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({
  propertyData,
  propertyType = 'Single Family',
  lotSize = '0.25 Acres',
  foundation = 'Concrete Slab',
  exteriorWalls = 'Vinyl Siding',
  roofing = 'Asphalt Shingle',
  yearBuilt,
  yearBuiltEffective,
}) => {
  const extendedDetails = propertyData?.extendedDetails;
  const normalizedProfile = propertyData?.normalizedProfile;

  const formatLotSize = (acres?: number, sqft?: number) => {
    if (acres && acres > 0) return `${acres.toFixed(2)} Acres`;
    if (sqft && sqft > 0) return `${sqft.toLocaleString()} sq ft`;
    return lotSize;
  };

  // Build year display: "Built 1960 — Renovated 2005" when effective differs
  const effectiveYear = normalizedProfile?.effectiveYearBuilt ?? yearBuiltEffective;
  const originalYear = yearBuilt;
  const formatBuildYear = () => {
    if (effectiveYear && originalYear && effectiveYear !== originalYear) {
      return `Built ${originalYear} — Renovated ${effectiveYear}`;
    }
    if (effectiveYear) return `${effectiveYear}`;
    if (originalYear) return `${originalYear}`;
    return undefined;
  };

  // Build quality as human-readable descriptor
  const formatBuildQuality = (quality?: string | null) => {
    if (!quality) return undefined;
    switch (quality) {
      case 'A': return 'Premium construction';
      case 'B': return 'Above-average construction';
      case 'C': return 'Standard construction';
      case 'D': return 'Below-average construction';
      default: return undefined;
    }
  };

  const buildYearValue = formatBuildYear();
  const buildQualityValue = formatBuildQuality(normalizedProfile?.buildQuality);
  const archStyleValue = normalizedProfile?.archStyle;

  const details = [
    {
      label: 'Property Type',
      value: propertyData?.propertyDetails?.propertyType || propertyType,
    },
    ...(buildYearValue ? [{ label: 'Build Year', value: buildYearValue }] : []),
    ...(archStyleValue ? [{ label: 'Architectural Style', value: archStyleValue }] : []),
    ...(buildQualityValue ? [{ label: 'Build Quality', value: buildQualityValue }] : []),
    {
      label: 'Lot Size',
      value: formatLotSize(extendedDetails?.lot?.sizeAcres, extendedDetails?.lot?.sizeSqFt),
    },
    {
      label: 'Foundation',
      value: foundation,
    },
    {
      label: 'Exterior Walls',
      value: extendedDetails?.building?.wallType || exteriorWalls,
    },
    {
      label: 'Roofing',
      value: extendedDetails?.building?.roofMaterial || roofing,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {details.map((detail, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
            <span className="text-muted-foreground">{detail.label}</span>
            <span className="font-medium">{detail.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};