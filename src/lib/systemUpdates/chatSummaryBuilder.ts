/**
 * System display names for chat-friendly messaging.
 */
const SYSTEM_DISPLAY_NAMES: Record<string, string> = {
  hvac: 'HVAC system',
  water_heater: 'water heater',
  roof: 'roof',
  electrical: 'electrical panel',
  electrical_panel: 'electrical panel',
  refrigerator: 'refrigerator',
  oven_range: 'oven/range',
  dishwasher: 'dishwasher',
  washer: 'washing machine',
  dryer: 'dryer',
  air_conditioner: 'air conditioner',
  furnace: 'furnace',
  pool: 'pool equipment',
  garage_door: 'garage door opener',
};

interface ChatSummaryParams {
  applied: boolean;
  held: boolean;
  wasOverwrite: boolean;
  fieldsUpdated: string[];
  fieldsHeld: string[];
  systemType?: string;
  brand?: string;
}

/**
 * Build a chat-safe summary message for the AI to relay.
 * 
 * This ensures the AI only speaks truth that has been persisted.
 * No celebration, no promises before writes.
 */
export function buildChatSummary(params: ChatSummaryParams): string {
  const { applied, held, systemType, brand } = params;

  if (applied && !held) {
    const systemName = systemType 
      ? SYSTEM_DISPLAY_NAMES[systemType] || systemType.replace(/_/g, ' ')
      : 'system';
    const brandNote = brand ? ` (${brand})` : '';
    
    // Minor #6: Be slightly more specific about what was learned
    return `I analyzed the photo and identified key details about your ${systemName}${brandNote}. I've updated your home profile and will use this to refine future assessments.`;
  }

  if (held) {
    return `I detected some details that differ from existing records. Can you confirm before I update your home profile?`;
  }

  return `I saved the photo but couldn't extract enough details. A closer shot of the manufacturer label would help improve accuracy.`;
}

/**
 * Build a summary for when analysis completely fails.
 */
export function buildAnalysisFailedSummary(): string {
  return `I had trouble processing this image. The photo was saved and I'll try again shortly.`;
}

/**
 * Build a summary for when no system type is detected.
 */
export function buildNoSystemDetectedSummary(): string {
  return `I saved the photo but couldn't extract clear details. A closer shot of the manufacturer label would help improve accuracy.`;
}
