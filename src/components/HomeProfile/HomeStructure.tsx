import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyHistory } from '@/lib/propertyAPI';
import { deriveClimateZone, ClimateZone } from '@/lib/climateZone';

// Structure-only insight lines (no HVAC or system-level insights)
const STRUCTURE_INSIGHTS: Record<string, string> = {
  // Roofing
  'tile': 'Tile roofs typically age slower but fail abruptly near end of life.',
  'asphalt': 'Asphalt shingles degrade faster in high-heat climates.',
  'metal': 'Metal roofing is durable but may require periodic coating.',
  'slate': 'Slate roofing is extremely durable with minimal maintenance.',
  
  // Exterior walls
  'stucco': 'Stucco requires regular inspection for hairline cracks.',
  'vinyl': 'Vinyl siding is low-maintenance but can fade over time.',
  'brick': 'Brick exteriors are durable but may need mortar repointing.',
  'wood': 'Wood siding requires regular painting and weather sealing.',
  
  // Foundation
  'slab': 'Slab foundations have lower maintenance but limited repair options.',
  'crawl': 'Crawl spaces need regular moisture and pest inspections.',
  'basement': 'Basements require waterproofing and humidity control.',
  
  // Stories
  'multi': 'Multi-story homes increase HVAC load and roof access difficulty.',
};

/**
 * Find matching insight for a given attribute value
 */
function getInsight(value: string | undefined): string | null {
  if (!value) return null;
  
  const normalizedValue = value.toLowerCase();
  
  for (const [key, insight] of Object.entries(STRUCTURE_INSIGHTS)) {
    if (normalizedValue.includes(key)) {
      return insight;
    }
  }
  
  return null;
}

interface HomeStructureProps {
  propertyData?: PropertyHistory;
  propertyType?: string;
  foundation?: string;
  stories?: number;
  exteriorWalls?: string;
  roofing?: string;
  lotSize?: string;
  city?: string;
  state?: string;
  lat?: number | null;
}

/**
 * HomeStructure - Property details grouped by decision relevance
 * 
 * Replaces generic PropertyDetails with 2-column grid:
 * - Column A: Structure (type, foundation, stories)
 * - Column B: Exterior & Site (walls, roof, lot, climate)
 * 
 * Includes insight hints for structure/exterior attributes only.
 */
export const HomeStructure: React.FC<HomeStructureProps> = ({
  propertyData,
  propertyType = 'Single Family',
  foundation = 'Unknown',
  stories,
  exteriorWalls,
  roofing,
  lotSize,
  city,
  state,
  lat,
}) => {
  // Use Attom data when available
  const extendedDetails = propertyData?.extendedDetails;
  
  const resolvedPropertyType = propertyData?.propertyDetails?.propertyType || propertyType;
  const resolvedExterior = extendedDetails?.building?.wallType || exteriorWalls || 'Unknown';
  const resolvedRoof = extendedDetails?.building?.roofMaterial || roofing || 'Unknown';
  const resolvedStories = stories || 1;
  
  // Format lot size
  const formatLotSize = (): string => {
    if (extendedDetails?.lot?.sizeAcres && extendedDetails.lot.sizeAcres > 0) {
      return `${extendedDetails.lot.sizeAcres.toFixed(2)} acres`;
    }
    if (extendedDetails?.lot?.sizeSqFt && extendedDetails.lot.sizeSqFt > 0) {
      return `${extendedDetails.lot.sizeSqFt.toLocaleString()} sq ft`;
    }
    return lotSize || 'Unknown';
  };
  
  // Get climate zone
  const climateZone: ClimateZone = deriveClimateZone(state, city, lat);
  
  // Check for multi-story insight
  const storiesInsight = resolvedStories >= 2 ? STRUCTURE_INSIGHTS['multi'] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="heading-h3">Home structure & materials</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column A: Structure */}
          <div className="space-y-4">
            <h4 className="text-label text-muted-foreground uppercase tracking-wider">Structure</h4>
            
            <div className="space-y-3">
              {/* Property Type */}
              <div className="flex justify-between items-baseline py-2 border-b border-border">
                <span className="text-muted-foreground">Property type</span>
                <span className="font-medium">{resolvedPropertyType}</span>
              </div>
              
              {/* Foundation */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline py-2 border-b border-border">
                  <span className="text-muted-foreground">Foundation</span>
                  <span className="font-medium">{foundation}</span>
                </div>
                {getInsight(foundation) && (
                  <p className="text-meta text-muted-foreground italic pl-2">
                    {getInsight(foundation)}
                  </p>
                )}
              </div>
              
              {/* Stories */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline py-2 border-b border-border">
                  <span className="text-muted-foreground">Stories</span>
                  <span className="font-medium">{resolvedStories}</span>
                </div>
                {storiesInsight && (
                  <p className="text-meta text-muted-foreground italic pl-2">
                    {storiesInsight}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Column B: Exterior & Site */}
          <div className="space-y-4">
            <h4 className="text-label text-muted-foreground uppercase tracking-wider">Exterior & Site</h4>
            
            <div className="space-y-3">
              {/* Exterior Walls */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline py-2 border-b border-border">
                  <span className="text-muted-foreground">Exterior walls</span>
                  <span className="font-medium">{resolvedExterior}</span>
                </div>
                {getInsight(resolvedExterior) && (
                  <p className="text-meta text-muted-foreground italic pl-2">
                    {getInsight(resolvedExterior)}
                  </p>
                )}
              </div>
              
              {/* Roofing */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline py-2 border-b border-border">
                  <span className="text-muted-foreground">Roofing material</span>
                  <span className="font-medium">{resolvedRoof}</span>
                </div>
                {getInsight(resolvedRoof) && (
                  <p className="text-meta text-muted-foreground italic pl-2">
                    {getInsight(resolvedRoof)}
                  </p>
                )}
              </div>
              
              {/* Lot Size */}
              <div className="flex justify-between items-baseline py-2 border-b border-border">
                <span className="text-muted-foreground">Lot size</span>
                <span className="font-medium">{formatLotSize()}</span>
              </div>
              
              {/* Climate Zone */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline py-2 border-b border-border">
                  <span className="text-muted-foreground">Climate zone</span>
                  <span className="font-medium">{climateZone.label}</span>
                </div>
                <p className="text-meta text-muted-foreground italic pl-2">
                  {climateZone.impact}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
