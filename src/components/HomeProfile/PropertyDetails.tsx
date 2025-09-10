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
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({
  propertyData,
  propertyType = 'Single Family',
  lotSize = '0.25 Acres',
  foundation = 'Concrete Slab',
  exteriorWalls = 'Vinyl Siding',
  roofing = 'Asphalt Shingle'
}) => {
  // Use Attom data when available, otherwise fall back to props or defaults
  const extendedDetails = propertyData?.extendedDetails;
  
  const formatLotSize = (acres?: number, sqft?: number) => {
    if (acres && acres > 0) return `${acres.toFixed(2)} Acres`;
    if (sqft && sqft > 0) return `${sqft.toLocaleString()} sq ft`;
    return lotSize;
  };

  const details = [
    { 
      label: 'Property Type', 
      value: propertyData?.propertyDetails?.propertyType || propertyType 
    },
    { 
      label: 'Lot Size', 
      value: formatLotSize(extendedDetails?.lot?.sizeAcres, extendedDetails?.lot?.sizeSqFt)
    },
    { 
      label: 'Foundation', 
      value: foundation // Attom doesn't provide foundation data
    },
    { 
      label: 'Exterior Walls', 
      value: extendedDetails?.building?.wallType || exteriorWalls 
    },
    { 
      label: 'Roofing', 
      value: extendedDetails?.building?.roofMaterial || roofing 
    }
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