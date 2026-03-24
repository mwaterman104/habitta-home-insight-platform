/**
 * PermitSignal - The ONLY semantic interface for permit data
 * 
 * RULE: No keyword matching outside this file.
 * 
 * IMPORTANT: verified === finalized permit exists (not necessarily full install)
 * This distinction matters because mechanical permits can include mods, not just installs.
 * 
 * @version v2 - Extended to support Roof and Water Heater
 */

export type PermitSystemType = 'hvac' | 'roof' | 'water_heater';

export interface SystemPermitSignal {
  systemType: PermitSystemType;
  /** Finalized permit exists */
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
  signalVersion: 'v2';
}

// Legacy type alias for backward compatibility
export type HVACPermitSignal = SystemPermitSignal;

// ============== Keywords defined ONCE - single source of truth ==============

const HVAC_KEYWORDS = [
  'hvac', 'air condition', 'a/c', 'ac unit', 'heat pump',
  'condenser', 'air handler', 'furnace', 'cooling', 'heating'
];

const HVAC_REPLACEMENT_KEYWORDS = [
  'replace', 'change out', 'changeout', 'change-out', 'upgrade', 'new unit'
];

const HVAC_INSTALL_KEYWORDS = ['install', 'new system', 'conversion'];

const ROOF_KEYWORDS = [
  'roof', 're-roof', 'reroof', 'shingle', 'tile roof', 'metal roof',
  'roofing', 'tear off', 'tear-off'
];

const ROOF_REPLACEMENT_KEYWORDS = [
  're-roof', 'reroof', 'tear off', 'tear-off', 'replacement', 'new roof', 'replace'
];

const WATER_HEATER_KEYWORDS = [
  'water heater', 'hot water', 'tankless', 'water heat', 'tank water'
];

const WATER_HEATER_REPLACEMENT_KEYWORDS = [
  'replace', 'new', 'install', 'conversion', 'upgrade'
];

// Keyword map by system type
const SYSTEM_KEYWORDS: Record<PermitSystemType, string[]> = {
  hvac: HVAC_KEYWORDS,
  roof: ROOF_KEYWORDS,
  water_heater: WATER_HEATER_KEYWORDS,
};

const REPLACEMENT_KEYWORDS: Record<PermitSystemType, string[]> = {
  hvac: HVAC_REPLACEMENT_KEYWORDS,
  roof: ROOF_REPLACEMENT_KEYWORDS,
  water_heater: WATER_HEATER_REPLACEMENT_KEYWORDS,
};

const INSTALL_KEYWORDS: Record<PermitSystemType, string[]> = {
  hvac: HVAC_INSTALL_KEYWORDS,
  roof: ['new roof', 'install'],
  water_heater: ['install', 'new'],
};

// ============== Main export ==============

/**
 * THE authoritative permit signal extractor (system-agnostic)
 * All downstream consumers use this - no raw permit inspection elsewhere
 * 
 * @param systemType - 'hvac' | 'roof' | 'water_heater'
 * @param permits - Array of permit records from any source (Shovels, database, etc.)
 * @returns SystemPermitSignal with normalized, bounded values
 */
export function deriveSystemPermitSignal(
  systemType: PermitSystemType,
  permits: any[]
): SystemPermitSignal {
  const emptySignal: SystemPermitSignal = {
    systemType,
    verified: false,
    installYear: null,
    installSource: null,
    confidenceBoost: 0,
    signalVersion: 'v2'
  };

  if (!permits?.length) return emptySignal;

  const keywords = SYSTEM_KEYWORDS[systemType];
  const replacementKws = REPLACEMENT_KEYWORDS[systemType];
  const installKws = INSTALL_KEYWORDS[systemType];

  // Find matching permits with dates
  const matchingPermits = permits.filter(p => {
    const text = `${p.description || ''} ${p.permit_type || ''} ${p.work_class || ''}`.toLowerCase();
    const isMatch = keywords.some(kw => text.includes(kw)) || 
      (systemType === 'hvac' && text.includes('mechanical'));
    const hasDate = p.date_finaled || p.final_date || p.approval_date || p.date_issued || p.issue_date;
    return isMatch && hasDate;
  });

  if (!matchingPermits.length) return emptySignal;

  // Sort by most authoritative date, get most recent
  matchingPermits.sort((a, b) => {
    const getDate = (p: any) => 
      p.date_finaled || p.final_date || p.approval_date || p.date_issued || p.issue_date;
    return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
  });

  const latest = matchingPermits[0];
  const desc = (latest.description || '').toLowerCase();
  
  const permitDate = latest.date_finaled || latest.final_date || 
                     latest.approval_date || 
                     latest.date_issued || latest.issue_date;

  // Classify: replacement vs new install
  const isReplacement = replacementKws.some(kw => desc.includes(kw));
  const isNewInstall = installKws.some(kw => desc.includes(kw)) && !isReplacement;

  const installSource: SystemPermitSignal['installSource'] = 
    isReplacement ? 'permit_replacement' 
    : isNewInstall ? 'permit_install' 
    : null;

  // Confidence boost based on classification (bounded values only)
  // - Replacement: 0.25 (verified but slight quality uncertainty)
  // - New install: 0.30 (new system, higher quality confidence)
  // - Unclassified permit: 0.15 (verified but unknown context)
  const confidenceBoost: SystemPermitSignal['confidenceBoost'] = 
    isReplacement ? 0.25 
    : isNewInstall ? 0.30 
    : 0.15;

  return {
    systemType,
    verified: true,
    installYear: permitDate ? new Date(permitDate).getFullYear() : null,
    installSource,
    permitNumber: latest.permit_number || latest.number,
    permitDescription: latest.description,
    confidenceBoost,
    signalVersion: 'v2'
  };
}

/**
 * Legacy function - derive HVAC permit signal
 * @deprecated Use deriveSystemPermitSignal('hvac', permits) instead
 */
export function deriveHVACPermitSignal(permits: any[]): SystemPermitSignal {
  return deriveSystemPermitSignal('hvac', permits);
}

/**
 * Check if permit matches a specific system type
 */
export function isSystemPermit(systemType: PermitSystemType, permit: any): boolean {
  const text = `${permit.description || ''} ${permit.permit_type || permit.type || ''} ${permit.work_class || ''}`.toLowerCase();
  const keywords = SYSTEM_KEYWORDS[systemType];
  return keywords.some(kw => text.includes(kw)) || 
    (systemType === 'hvac' && text.includes('mechanical'));
}

/**
 * Check if HVAC permit keywords match (backward compatibility)
 */
export function isHVACPermit(permit: any): boolean {
  return isSystemPermit('hvac', permit);
}

/**
 * Check if permit indicates replacement vs new install
 */
export function isReplacementPermit(systemType: PermitSystemType, permit: any): boolean {
  const desc = (permit.description || '').toLowerCase();
  const replacementKws = REPLACEMENT_KEYWORDS[systemType];
  return replacementKws.some(kw => desc.includes(kw));
}
