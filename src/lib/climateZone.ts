/**
 * Climate Zone Derivation Utility
 * 
 * Extracted from PropertyMap for reuse across Home Profile and other surfaces.
 * V1: Heuristic-based (will be replaced with proper climate data API).
 */

import { Thermometer, Droplet, Snowflake, Sun } from 'lucide-react';

export type ClimateZoneType = 'high_heat' | 'coastal' | 'freeze_thaw' | 'moderate';

export interface ClimateZone {
  zone: ClimateZoneType;
  label: string;
  impact: string;
  icon: React.ElementType;
  gradient: string;
}

/**
 * Derive climate zone based on location
 * 
 * Uses city/state name heuristics and latitude.
 * Returns zone with label, impact description, and styling.
 */
export function deriveClimateZone(
  state?: string,
  city?: string,
  lat?: number | null
): ClimateZone {
  const location = `${city || ''} ${state || ''}`.toLowerCase();

  // South Florida / low latitude - high heat & humidity
  if (
    location.includes('miami') ||
    location.includes('fort lauderdale') ||
    location.includes('west palm') ||
    location.includes('tampa') ||
    location.includes('orlando') ||
    location.includes('phoenix') ||
    location.includes('tucson') ||
    location.includes('las vegas') ||
    location.includes('houston') ||
    location.includes('san antonio') ||
    state?.toLowerCase() === 'florida' ||
    state?.toLowerCase() === 'az' ||
    state?.toLowerCase() === 'arizona' ||
    (lat && lat < 28)
  ) {
    return {
      zone: 'high_heat',
      label: 'High heat & humidity zone',
      impact: 'Impacts HVAC, roof, and water heater lifespan',
      icon: Thermometer,
      gradient: 'from-orange-100/60 to-amber-100/40',
    };
  }

  // Coastal areas
  if (
    location.includes('beach') ||
    location.includes('coast') ||
    location.includes('key ') ||
    location.includes('island') ||
    location.includes('santa monica') ||
    location.includes('san diego') ||
    location.includes('malibu')
  ) {
    return {
      zone: 'coastal',
      label: 'Salt air exposure zone',
      impact: 'Accelerates exterior and HVAC wear',
      icon: Droplet,
      gradient: 'from-cyan-100/60 to-blue-100/40',
    };
  }

  // Northern / freeze-thaw areas
  if (
    location.includes('boston') ||
    location.includes('chicago') ||
    location.includes('minneapolis') ||
    location.includes('denver') ||
    location.includes('detroit') ||
    location.includes('milwaukee') ||
    location.includes('buffalo') ||
    location.includes('cleveland') ||
    location.includes('pittsburgh') ||
    ['mn', 'wi', 'mi', 'nd', 'sd', 'mt', 'wy', 'vt', 'nh', 'me', 'minnesota', 'wisconsin', 'michigan'].includes(
      state?.toLowerCase() || ''
    ) ||
    (lat && lat > 42)
  ) {
    return {
      zone: 'freeze_thaw',
      label: 'Freeze-thaw zone',
      impact: 'Impacts plumbing, foundation, and exterior',
      icon: Snowflake,
      gradient: 'from-blue-100/60 to-slate-100/40',
    };
  }

  // Default: moderate
  return {
    zone: 'moderate',
    label: 'Moderate climate zone',
    impact: 'Standard wear patterns expected',
    icon: Sun,
    gradient: 'from-green-100/40 to-emerald-100/30',
  };
}

/**
 * Get climate zone display info for Home Profile
 */
export function getClimateZoneDisplay(zone: ClimateZone): {
  label: string;
  description: string;
} {
  return {
    label: zone.label,
    description: zone.impact,
  };
}
