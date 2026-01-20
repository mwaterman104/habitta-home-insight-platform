/**
 * Permit analysis helper for HVAC detection
 * 
 * Identifies HVAC replacement permits from permit data
 * and extracts install year for system enrichment.
 */

export interface HVACEnrichmentSignal {
  hvac_permit_found: boolean;
  hvac_install_year: number | null;
  hvac_permit_confidence: number;
  permit_number?: string;
  permit_description?: string;
}

const HVAC_KEYWORDS = [
  'hvac', 'air condition', 'a/c', 'ac unit', 'heat pump',
  'condenser', 'air handler', 'furnace', 'cooling', 'heating'
];

const REPLACEMENT_KEYWORDS = [
  'replace', 'change out', 'changeout', 'change-out', 'upgrade',
  'new unit', 'install', 'conversion', 'new system'
];

/**
 * Check if a permit is an HVAC replacement permit
 */
export function isHVACReplacementPermit(permit: any): boolean {
  const desc = (permit.description || '').toLowerCase();
  const permitType = (permit.permit_type || permit.type || '').toLowerCase();
  const workClass = (permit.work_class || '').toLowerCase();
  
  const text = `${desc} ${permitType} ${workClass}`;
  
  const isHVAC = HVAC_KEYWORDS.some(kw => text.includes(kw)) ||
                 permitType.includes('mechanical');
  
  const isReplacement = REPLACEMENT_KEYWORDS.some(kw => text.includes(kw));
  
  // Must be both HVAC-related AND a replacement/install
  return isHVAC && isReplacement;
}

/**
 * Extract HVAC enrichment signal from permits array
 */
export function extractHVACSignal(permits: any[]): HVACEnrichmentSignal {
  if (!permits || permits.length === 0) {
    return {
      hvac_permit_found: false,
      hvac_install_year: null,
      hvac_permit_confidence: 0,
    };
  }
  
  // Filter to HVAC replacement permits
  const hvacPermits = permits.filter(p => {
    const hasDate = p.issue_date || p.date_issued;
    return isHVACReplacementPermit(p) && hasDate;
  });
  
  if (hvacPermits.length === 0) {
    return {
      hvac_permit_found: false,
      hvac_install_year: null,
      hvac_permit_confidence: 0,
    };
  }
  
  // Sort by date, get most recent
  hvacPermits.sort((a, b) => {
    const dateA = new Date(a.issue_date || a.date_issued).getTime();
    const dateB = new Date(b.issue_date || b.date_issued).getTime();
    return dateB - dateA;
  });
  
  const latestPermit = hvacPermits[0];
  const permitDate = latestPermit.issue_date || latestPermit.date_issued;
  const installYear = new Date(permitDate).getFullYear();
  
  return {
    hvac_permit_found: true,
    hvac_install_year: installYear,
    hvac_permit_confidence: 0.85, // Permits are reliable
    permit_number: latestPermit.permit_number || latestPermit.number,
    permit_description: latestPermit.description,
  };
}

/**
 * Check if any permits were found (for confidence calculation)
 */
export function hasAnyPermits(permits: any[]): boolean {
  return Array.isArray(permits) && permits.length > 0;
}
