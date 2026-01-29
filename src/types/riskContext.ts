/**
 * Risk Context Types
 * 
 * Used for calculating urgency premiums based on environmental
 * and market conditions. These are DERIVED, not stored.
 */

export interface RiskContext {
  hurricaneSeason: boolean;
  freezeWarning: boolean;
  heatWave: boolean;
  currentDate: Date;
  location: {
    state: string;
    climateZone: string;
  };
  peakSeasonHvac: boolean;
  peakSeasonRoofing: boolean;
}

/**
 * Database row type for risk_contexts table
 */
export interface RiskContextRow {
  id: string;
  state: string;
  climate_zone: string;
  hurricane_season: boolean;
  freeze_warning: boolean;
  heat_wave: boolean;
  peak_season_hvac: boolean;
  peak_season_roofing: boolean;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

/**
 * Map database row to frontend RiskContext type
 */
export function mapRiskContextRow(row: RiskContextRow): RiskContext {
  return {
    hurricaneSeason: row.hurricane_season,
    freezeWarning: row.freeze_warning,
    heatWave: row.heat_wave,
    currentDate: new Date(),
    location: {
      state: row.state,
      climateZone: row.climate_zone,
    },
    peakSeasonHvac: row.peak_season_hvac,
    peakSeasonRoofing: row.peak_season_roofing,
  };
}

/**
 * Default risk context when no data available
 */
export function getDefaultRiskContext(state: string = '', climateZone: string = ''): RiskContext {
  return {
    hurricaneSeason: false,
    freezeWarning: false,
    heatWave: false,
    currentDate: new Date(),
    location: { state, climateZone },
    peakSeasonHvac: false,
    peakSeasonRoofing: false,
  };
}
