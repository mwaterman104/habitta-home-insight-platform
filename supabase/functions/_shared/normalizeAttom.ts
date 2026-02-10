/**
 * normalizeAttom.ts - Canonical ATTOM Normalization Layer
 * 
 * INVARIANT: This is the ONLY place raw ATTOM data is interpreted.
 * No UI, inference engine, or report reads _attomData directly.
 * 
 * Input:  Raw ATTOM property object (from attom-property response)
 * Output: NormalizedAttomProfile with clean, typed fields
 */

export interface NormalizedAttomProfile {
  effectiveYearBuilt: number;
  buildQuality: 'A' | 'B' | 'C' | 'D' | null;
  archStyle: string | null;
  grossSqft: number | null;
  groundFloorSqft: number | null;
  roomsTotal: number | null;
  bathsFull: number | null;
  bathsHalf: number | null;
  parking: {
    type: string | null;
    spaces: number | null;
  };
  lastSale: {
    amount: number | null;
    date: string | null;
    pricePerSqft: number | null;
    disclosureType: string | null;
  } | null;
  dataMatchConfidence: 'high' | 'medium' | 'low';
  fipsCode: string | null;
}

/**
 * Map ATTOM matchCode to internal confidence level.
 * This is behavioral only — never displayed to users.
 */
function mapMatchCode(matchCode: string | null | undefined): 'high' | 'medium' | 'low' {
  if (!matchCode) return 'low';
  const code = matchCode.toLowerCase();
  if (code.includes('exact') || code.includes('street')) return 'high';
  if (code.includes('city')) return 'medium';
  return 'low';
}

/**
 * Normalize ATTOM bldgQuality to canonical A/B/C/D.
 * ATTOM uses various formats: "A", "A+", "A-", "Fair", "Good", etc.
 */
function normalizeBuildQuality(raw: string | null | undefined): 'A' | 'B' | 'C' | 'D' | null {
  if (!raw) return null;
  const upper = raw.toUpperCase().trim();

  // Direct letter grades
  if (upper.startsWith('A')) return 'A';
  if (upper.startsWith('B')) return 'B';
  if (upper.startsWith('C')) return 'C';
  if (upper.startsWith('D') || upper.startsWith('E') || upper.startsWith('F')) return 'D';

  // Descriptive values
  const descriptorMap: Record<string, 'A' | 'B' | 'C' | 'D'> = {
    'excellent': 'A',
    'good': 'B',
    'average': 'B',
    'fair': 'C',
    'poor': 'D',
    'low': 'D',
  };

  for (const [key, grade] of Object.entries(descriptorMap)) {
    if (upper.includes(key.toUpperCase())) return grade;
  }

  return null;
}

/**
 * Normalize a raw ATTOM property object into a clean, typed profile.
 * 
 * Handles the raw property object structure from the ATTOM property/detail endpoint.
 * This is the single source of truth for ATTOM field extraction.
 */
export function normalizeAttom(rawProperty: any): NormalizedAttomProfile {
  if (!rawProperty) {
    return getEmptyProfile();
  }

  const building = rawProperty.building || {};
  const summary = building.summary || {};
  const size = building.size || {};
  const rooms = building.rooms || {};
  const parking = building.parking || {};
  const sale = rawProperty.sale || {};
  const saleAmount = sale.amount || {};
  const saleCalc = sale.calculation || {};
  const identifier = rawProperty.identifier || {};
  const address = rawProperty.address || {};

  // Core: effectiveYearBuilt always resolves to yearBuiltEffective ?? yearBuilt
  const yearBuiltEffective = toInt(summary.yearBuiltEffective);
  const yearBuilt = toInt(summary.yearBuilt) || toInt(rawProperty.summary?.yearbuilt);
  const effectiveYearBuilt = yearBuiltEffective || yearBuilt || 0;

  // Sale data
  const saleAmt = toFloat(saleAmount.saleAmt);
  const pricePerSqft = toFloat(saleCalc.pricePerSizeUnit);
  const saleDate = sale.transDate || sale.salesSearchDate || null;
  const hasLastSale = saleAmt && saleAmt > 0;

  return {
    effectiveYearBuilt,
    buildQuality: normalizeBuildQuality(summary.bldgQuality),
    archStyle: summary.archStyle || null,
    grossSqft: toInt(size.grossSize),
    groundFloorSqft: toInt(size.groundFloorSize),
    roomsTotal: toInt(rooms.roomsTotal),
    bathsFull: toInt(rooms.bathsFull),
    bathsHalf: toInt(rooms.bathsHalf),
    parking: {
      type: parking.prkgType || null,
      spaces: toInt(parking.prkgSpaces),
    },
    lastSale: hasLastSale ? {
      amount: saleAmt,
      date: saleDate,
      pricePerSqft: pricePerSqft,
      disclosureType: saleAmount.saleDisclosureType || null,
    } : null,
    dataMatchConfidence: mapMatchCode(address.matchCode),
    fipsCode: identifier.fips || null,
  };
}

/**
 * Return an empty profile when no data is available
 */
function getEmptyProfile(): NormalizedAttomProfile {
  return {
    effectiveYearBuilt: 0,
    buildQuality: null,
    archStyle: null,
    grossSqft: null,
    groundFloorSqft: null,
    roomsTotal: null,
    bathsFull: null,
    bathsHalf: null,
    parking: { type: null, spaces: null },
    lastSale: null,
    dataMatchConfidence: 'low',
    fipsCode: null,
  };
}

// ============== Helpers ==============

function toInt(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function toFloat(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}
