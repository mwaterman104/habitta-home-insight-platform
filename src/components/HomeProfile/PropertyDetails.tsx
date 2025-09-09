import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PropertyDetailsProps {
  propertyType?: string;
  lotSize?: string;
  foundation?: string;
  exteriorWalls?: string;
  roofing?: string;
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({
  propertyType = 'Single Family',
  lotSize = '0.25 Acres',
  foundation = 'Concrete Slab',
  exteriorWalls = 'Vinyl Siding',
  roofing = 'Asphalt Shingle'
}) => {
  const details = [
    { label: 'Property Type', value: propertyType },
    { label: 'Lot Size', value: lotSize },
    { label: 'Foundation', value: foundation },
    { label: 'Exterior Walls', value: exteriorWalls },
    { label: 'Roofing', value: roofing }
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