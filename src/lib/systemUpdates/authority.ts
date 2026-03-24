/**
 * Authority Rank Definitions
 * 
 * Higher authority never gets overwritten by lower authority.
 * This is the spine of the system update contract.
 */

export type SystemUpdateSource =
  | 'professional_override'  // Pro verification (future)
  | 'user_confirmed'         // User explicitly confirmed/corrected
  | 'photo_analysis'         // AI vision extraction
  | 'permit_record'          // Public permit data
  | 'inferred';              // Heuristic/age-based estimation

export const AUTHORITY_RANK: Record<SystemUpdateSource, number> = {
  professional_override: 5,
  user_confirmed: 4,
  photo_analysis: 3,
  permit_record: 2,
  inferred: 1,
};

export interface FieldProvenance {
  source: SystemUpdateSource;
  confidence: number;
  updated_at: string;
}
