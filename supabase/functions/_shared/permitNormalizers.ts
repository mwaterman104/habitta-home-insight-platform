/**
 * Permit Normalizers - Source-specific transformations to unified permit model
 * 
 * RULE: All normalization happens here. Downstream code (deriveHVACPermitSignal, scoring)
 * never knows which source the permit came from.
 * 
 * The `source` field is informational only - scoring MUST NOT branch on it.
 */

export type PermitSource = 'shovels' | 'miami_dade' | 'manual';

export interface NormalizedPermit {
  permit_number: string | null;
  permit_type: string | null;
  work_class: string | null;
  description: string | null;
  status: string | null;
  date_issued: string | null;      // ISO date string YYYY-MM-DD
  date_finaled: string | null;     // ISO date string YYYY-MM-DD
  approval_date: string | null;    // ISO date string YYYY-MM-DD
  valuation: number | null;
  contractor_name: string | null;
  contractor_license: string | null;
  jurisdiction: string | null;
  source_url: string | null;
  source: PermitSource;
  parcel_id: string | null;        // FOLIO for Miami-Dade, geo_id for Shovels
  raw: any;                        // Original record for debugging
}

/**
 * Parse Miami-Dade YYYYMMDD string format to ISO date
 */
function parseMiamiDadeDate(dateStr: string | number | null | undefined): string | null {
  if (!dateStr) return null;
  
  const str = String(dateStr);
  
  // Handle epoch timestamps (milliseconds)
  if (/^\d{13}$/.test(str)) {
    return new Date(parseInt(str)).toISOString().split('T')[0];
  }
  
  // Handle YYYYMMDD format
  if (/^\d{8}$/.test(str)) {
    const year = str.slice(0, 4);
    const month = str.slice(4, 6);
    const day = str.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
  
  // Handle ISO or other standard date formats
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Fall through
  }
  
  return null;
}

/**
 * Normalize Miami-Dade ArcGIS permit to unified model
 * 
 * Miami-Dade fields:
 * - PROCNUM: permit number
 * - TYPE: permit type (MECH, BLDG, ELEC, PLUM, etc.)
 * - DESC1-DESC10: description fields
 * - ISSUDATE: epoch timestamp (ms)
 * - LSTINSDT, BLDCMPDT: finalization dates (YYYYMMDD)
 * - LSTAPPRDT: approval date (YYYYMMDD)
 * - CONTRNAME: contractor name
 * - FOLIO: parcel identifier
 * - PROJVAL: project value
 * - STATUS, STATDESC: permit status
 */
export function normalizeMiamiDadePermit(raw: any): NormalizedPermit {
  // Concatenate description fields
  const descFields = ['DESC1', 'DESC2', 'DESC3', 'DESC4', 'DESC5', 
                      'DESC6', 'DESC7', 'DESC8', 'DESC9', 'DESC10'];
  const description = descFields
    .map(f => raw[f] || raw[f.toLowerCase()])
    .filter(Boolean)
    .join(' ')
    .trim() || null;

  // Map TYPE to readable permit type
  const typeMap: Record<string, string> = {
    'MECH': 'Mechanical',
    'BLDG': 'Building',
    'ELEC': 'Electrical',
    'PLUM': 'Plumbing',
    'ROOF': 'Roofing',
    'DEMO': 'Demolition',
    'FIRE': 'Fire',
  };
  const rawType = raw.TYPE || raw.type;
  const permit_type = typeMap[rawType] || rawType || null;

  return {
    permit_number: raw.PROCNUM || raw.procnum || raw.ID || raw.id || null,
    permit_type,
    work_class: raw.WORKCLASS || raw.workclass || null,
    description,
    status: raw.STATDESC || raw.statdesc || raw.STATUS || raw.status || null,
    date_issued: parseMiamiDadeDate(raw.ISSUDATE || raw.issudate),
    date_finaled: parseMiamiDadeDate(raw.LSTINSDT || raw.lstinsdt || raw.BLDCMPDT || raw.bldcmpdt),
    approval_date: parseMiamiDadeDate(raw.LSTAPPRDT || raw.lstapprdt),
    valuation: raw.PROJVAL != null ? Number(raw.PROJVAL) : 
               raw.projval != null ? Number(raw.projval) : null,
    contractor_name: raw.CONTRNAME || raw.contrname || null,
    contractor_license: raw.CONTRLICNO || raw.contrlicno || null,
    jurisdiction: 'Miami-Dade County',
    source_url: null, // ArcGIS doesn't provide direct URLs
    source: 'miami_dade',
    parcel_id: raw.FOLIO || raw.folio || null,
    raw,
  };
}

/**
 * Normalize Shovels V2 permit to unified model
 */
export function normalizeShovelsPermit(raw: any): NormalizedPermit {
  return {
    permit_number: raw.number || null,
    permit_type: raw.type || null,
    work_class: null,
    description: raw.description || null,
    status: raw.status || null,
    date_issued: raw.issue_date ? new Date(raw.issue_date).toISOString().split('T')[0] : null,
    date_finaled: raw.final_date ? new Date(raw.final_date).toISOString().split('T')[0] : null,
    approval_date: null, // Shovels doesn't provide separate approval date
    valuation: raw.job_value != null ? Number(raw.job_value) : null,
    contractor_name: null,
    contractor_license: null,
    jurisdiction: raw.jurisdiction || null,
    source_url: raw.source_url || null,
    source: 'shovels',
    parcel_id: raw.geo_id || null,
    raw,
  };
}

/**
 * Convert NormalizedPermit to database-ready format
 */
export function toPermitDbRecord(
  permit: NormalizedPermit, 
  userId: string, 
  homeId: string,
  isEnergyRelated: boolean,
  systemTags: string[],
  hash: string
) {
  return {
    user_id: userId,
    home_id: homeId,
    permit_number: permit.permit_number,
    permit_type: permit.permit_type,
    work_class: permit.work_class,
    description: permit.description,
    status: permit.status,
    date_issued: permit.date_issued,
    date_finaled: permit.date_finaled,
    valuation: permit.valuation,
    contractor_name: permit.contractor_name,
    contractor_license: permit.contractor_license,
    jurisdiction: permit.jurisdiction,
    source_url: permit.source_url,
    source: permit.source,
    is_energy_related: isEnergyRelated,
    system_tags: systemTags,
    hash,
    raw: permit.raw,
  };
}
