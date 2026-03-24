/**
 * ATTOM data extraction helper
 * 
 * Normalizes ATTOM API responses to extract key property facts.
 * Handles both the transformed response from attom-property and raw responses.
 */

import { normalizeAttom, type NormalizedAttomProfile } from './normalizeAttom.ts';

export interface AttomPropertyFacts {
  yearBuilt: number | null;
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  lotSizeSqFt: number | null;
  roofMaterial: string | null;
  heatingType: string | null;
  coolingType: string | null;
  confidence: number;
  // Sprint 1 additions
  effectiveYearBuilt: number | null;
  buildQuality: 'A' | 'B' | 'C' | 'D' | null;
  archStyle: string | null;
  grossSqft: number | null;
  roomsTotal: number | null;
  groundFloorSqft: number | null;
  dataMatchConfidence: 'high' | 'medium' | 'low';
  fipsCode: string | null;
}

/**
 * Extract normalized property facts from ATTOM response
 */
export function extractAttomFacts(attomData: any): AttomPropertyFacts {
  const emptyFacts: AttomPropertyFacts = {
    yearBuilt: null,
    squareFeet: null,
    bedrooms: null,
    bathrooms: null,
    propertyType: null,
    lotSizeSqFt: null,
    roofMaterial: null,
    heatingType: null,
    coolingType: null,
    confidence: 0,
    effectiveYearBuilt: null,
    buildQuality: null,
    archStyle: null,
    grossSqft: null,
    roomsTotal: null,
    groundFloorSqft: null,
    dataMatchConfidence: 'low',
    fipsCode: null,
  };

  if (!attomData) {
    return emptyFacts;
  }
  
  // Handle transformed response from attom-property function
  // Use normalizeAttom on _attomData if available for new fields
  if (attomData.propertyDetails) {
    const details = attomData.propertyDetails;
    const extended = attomData.extendedDetails || {};
    
    // Extract new fields via canonical normalizer if raw data is available
    const normalized = attomData._attomData 
      ? normalizeAttom(attomData._attomData)
      : attomData.normalizedProfile || null;
    
    return {
      yearBuilt: details.yearBuilt || null,
      squareFeet: details.sqft || null,
      bedrooms: details.bedrooms || null,
      bathrooms: details.bathrooms || null,
      propertyType: details.propertyType || null,
      lotSizeSqFt: extended.lot?.sizeSqFt || null,
      roofMaterial: extended.building?.roofMaterial || null,
      heatingType: extended.utilities?.heatingType || null,
      coolingType: extended.utilities?.cooling || null,
      confidence: 0.85,
      effectiveYearBuilt: normalized?.effectiveYearBuilt || null,
      buildQuality: normalized?.buildQuality || null,
      archStyle: normalized?.archStyle || null,
      grossSqft: normalized?.grossSqft || null,
      roomsTotal: normalized?.roomsTotal || null,
      groundFloorSqft: normalized?.groundFloorSqft || null,
      dataMatchConfidence: normalized?.dataMatchConfidence || 'low',
      fipsCode: normalized?.fipsCode || null,
    };
  }
  
  // Handle raw ATTOM API response (property array format)
  if (attomData.property && Array.isArray(attomData.property) && attomData.property.length > 0) {
    const prop = attomData.property[0];
    const normalized = normalizeAttom(prop);
    
    return {
      yearBuilt: prop.summary?.yearbuilt || prop.building?.summary?.yearBuilt || null,
      squareFeet: prop.building?.size?.livingsize || prop.building?.size?.bldgsize || null,
      bedrooms: prop.building?.rooms?.beds || null,
      bathrooms: prop.building?.rooms?.bathstotal || null,
      propertyType: prop.summary?.propertyType || prop.building?.summary?.bldgType || null,
      lotSizeSqFt: prop.lot?.lotsize2 || null,
      roofMaterial: prop.building?.construction?.roofcover || null,
      heatingType: prop.utilities?.heatingtype || null,
      coolingType: prop.utilities?.coolingtype || null,
      confidence: 0.85,
      effectiveYearBuilt: normalized.effectiveYearBuilt || null,
      buildQuality: normalized.buildQuality,
      archStyle: normalized.archStyle,
      grossSqft: normalized.grossSqft,
      roomsTotal: normalized.roomsTotal,
      groundFloorSqft: normalized.groundFloorSqft,
      dataMatchConfidence: normalized.dataMatchConfidence,
      fipsCode: normalized.fipsCode,
    };
  }
  
  // Handle _attomData embedded in response
  if (attomData._attomData) {
    return extractAttomFacts({ property: [attomData._attomData] });
  }
  
  return emptyFacts;
}

/**
 * Check if ATTOM response has usable data
 */
export function hasAttomData(attomData: any): boolean {
  const facts = extractAttomFacts(attomData);
  return facts.yearBuilt !== null || facts.squareFeet !== null;
}
