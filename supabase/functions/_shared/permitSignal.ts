/**
 * HVACPermitSignal - The ONLY semantic interface for HVAC permit data
 * 
 * RULE: No keyword matching outside this file.
 * 
 * IMPORTANT: verified === finalized HVAC-related permit exists (not necessarily full install)
 * This distinction matters because mechanical permits can include duct mods, not just installs.
 * 
 * @version v1
 */

export interface HVACPermitSignal {
  /** Finalized HVAC-related permit exists (not necessarily full install verified) */
  verified: boolean;
  /** Install year from permit date (prefers finalization date) */
  installYear: number | null;
  /** Classification: replacement, new install, or unclassified */
  installSource: 'permit_install' | 'permit_replacement' | null;
  /** Permit tracking number */
  permitNumber?: string;
  /** Original permit description */
  permitDescription?: string;
  /** Bounded confidence boost for scoring */
  confidenceBoost: 0 | 0.15 | 0.25 | 0.30;
  /** Signal version for reproducibility */
  signalVersion: 'v1';
}

// ============== Keywords defined ONCE - single source of truth ==============

const HVAC_KEYWORDS = [
  'hvac', 'air condition', 'a/c', 'ac unit', 'heat pump',
  'condenser', 'air handler', 'furnace', 'cooling', 'heating'
];

const REPLACEMENT_KEYWORDS = [
  'replace', 'change out', 'changeout', 'change-out', 'upgrade', 'new unit'
];

const INSTALL_KEYWORDS = ['install', 'new system', 'conversion'];

// ============== Main export ==============

/**
 * THE authoritative permit signal extractor
 * All downstream consumers use this - no raw permit inspection elsewhere
 * 
 * @param permits - Array of permit records from any source (Shovels, database, etc.)
 * @returns HVACPermitSignal with normalized, bounded values
 */
export function deriveHVACPermitSignal(permits: any[]): HVACPermitSignal {
  const emptySignal: HVACPermitSignal = {
    verified: false,
    installYear: null,
    installSource: null,
    confidenceBoost: 0,
    signalVersion: 'v1'
  };

  if (!permits?.length) return emptySignal;

  // Find HVAC permits with dates
  const hvacPermits = permits.filter(p => {
    const text = `${p.description || ''} ${p.permit_type || p.type || ''} ${p.work_class || ''}`.toLowerCase();
    const isHVAC = HVAC_KEYWORDS.some(kw => text.includes(kw)) || text.includes('mechanical');
    // TWEAK #1: Prefer finalization date for date availability check
    const hasDate = p.final_date || p.date_finaled || p.approval_date || p.issue_date || p.date_issued;
    return isHVAC && hasDate;
  });

  if (!hvacPermits.length) return emptySignal;

  // Sort by most authoritative date, get most recent
  // TWEAK #1: Prefer completion/finalization dates for accuracy
  hvacPermits.sort((a, b) => {
    const getDate = (p: any) => 
      p.final_date || p.date_finaled || p.approval_date || p.issue_date || p.date_issued;
    return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
  });

  const latest = hvacPermits[0];
  const desc = (latest.description || '').toLowerCase();
  
  // TWEAK #1: Prefer final_date > approval_date > issue_date for install year accuracy
  const permitDate = latest.final_date || latest.date_finaled || 
                     latest.approval_date || 
                     latest.issue_date || latest.date_issued;

  // Classify: replacement vs new install
  const isReplacement = REPLACEMENT_KEYWORDS.some(kw => desc.includes(kw));
  const isNewInstall = INSTALL_KEYWORDS.some(kw => desc.includes(kw)) && !isReplacement;

  const installSource: HVACPermitSignal['installSource'] = 
    isReplacement ? 'permit_replacement' 
    : isNewInstall ? 'permit_install' 
    : null;

  // Confidence boost based on classification (bounded values only)
  // - Replacement: 0.25 (verified but slight quality uncertainty)
  // - New install: 0.30 (new system, higher quality confidence)
  // - Unclassified HVAC permit: 0.15 (verified but unknown context)
  const confidenceBoost: HVACPermitSignal['confidenceBoost'] = 
    isReplacement ? 0.25 
    : isNewInstall ? 0.30 
    : 0.15;

  return {
    verified: true, // TWEAK #2: This means "finalized HVAC permit exists" not "full install verified"
    installYear: permitDate ? new Date(permitDate).getFullYear() : null,
    installSource,
    permitNumber: latest.permit_number || latest.number,
    permitDescription: latest.description,
    confidenceBoost,
    signalVersion: 'v1'
  };
}

/**
 * Check if HVAC permit keywords match (for system enrichment)
 * Used only internally for database enrichment, not for signal derivation
 */
export function isHVACPermit(permit: any): boolean {
  const text = `${permit.description || ''} ${permit.permit_type || permit.type || ''} ${permit.work_class || ''}`.toLowerCase();
  return HVAC_KEYWORDS.some(kw => text.includes(kw)) || text.includes('mechanical');
}

/**
 * Check if permit indicates replacement vs new install
 */
export function isReplacementPermit(permit: any): boolean {
  const desc = (permit.description || '').toLowerCase();
  return REPLACEMENT_KEYWORDS.some(kw => desc.includes(kw));
}
