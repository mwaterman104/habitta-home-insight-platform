/**
 * Chat Formatting Utilities
 * 
 * NORMALIZATION LAYER - NOT SEMANTIC INFERENCE
 * 
 * This module handles:
 * - Detection and extraction of structured data (JSON blocks)
 * - Sanitization of pseudo-XML artifact tags
 * - Pattern-based normalization (section labels, bullet lists)
 * 
 * It does NOT:
 * - Infer authority or confidence from formatting
 * - Make governance decisions about emphasis
 * - Determine advisory vs informational tone
 */

// ============================================
// Types
// ============================================

export interface ContractorRecommendation {
  name: string;
  rating: number;
  reviewCount: number;
  category: string;
  location: string;
  websiteUri?: string;
  phone?: string;
}

export interface PostConfirmationAdvisoryData {
  tier: 'late_life' | 'planning_window' | 'mid_life' | 'early_life';
  systemKey: string;
  systemLabel: string;
  age: number | null;
  expectedLifespan: number;
  remainingYears: number;
  climateLabel: string;
  advisoryConfident: boolean;
  nowActions?: string[];
  planActions?: string[];
  precisionCTA?: string | null;
  closingIntent?: string;
  statusNote?: string;  // For mid_life/early_life tiers
}

export interface SystemUpdateData {
  success: boolean;
  systemKey: string;
  alreadyRecorded: boolean;
  installedLine?: string;
  confidenceLevel?: string;
  message?: string;
  reason?: string;
  postConfirmationAdvisory?: PostConfirmationAdvisoryData;
}

export interface ReplacementTradeoffData {
  success: boolean;
  systemType: string;
  displayName?: string;
  plannedReplacement?: { low: number; high: number; label: string };
  emergencyReplacement?: { low: number; high: number; label: string; premiumPercent: number };
  tradeoffDelta?: { low: number; high: number; description: string };
  yearsUntilLikely?: number | null;
  riskBand?: 'low' | 'moderate' | 'elevated';
  recommendation?: string;
  dataQuality?: string;
  disclosureNote?: string;
  message?: string;
}

export interface ProposedAdditionData {
  success: boolean;
  systemType: string;
  displayName?: string;
  quantity?: number;
  estimatedCost?: { low: number; high: number; label: string };
  rushPremium?: { percent: number; low: number; high: number; label: string };
  expectedLifespan?: number;
  recommendation?: string;
}

export interface UnknownIssueData {
  success: false;
  issueType?: string;
  message?: string;
  suggestion?: string;
}

export interface SmallApplianceRepairData {
  success: boolean;
  applianceType?: string;
  displayName?: string;
  costRange?: { min: number; max: number };
  diyEligible?: boolean;
  tradeType?: string;
  message?: string;
}

export interface MediumSystemRepairData {
  success: boolean;
  systemType?: string;
  displayName?: string;
  costRange?: { min: number; max: number };
  diyEligible?: boolean;
  tradeType?: string;
  message?: string;
}

export interface HomeEventData {
  success: boolean;
  eventId?: string;
  assetId?: string;
  isNewAsset?: boolean;
  eventType?: string;
  systemKind?: string;
  title?: string;
  message?: string;
  clarificationNeeded?: boolean;
}

export interface ExtractedStructuredData {
  contractors?: {
    service?: string;
    disclaimer: string;
    confidence: string;
    items: ContractorRecommendation[];
    message?: string;
    suggestion?: string;
  };
  systemUpdate?: SystemUpdateData;
  replacementTradeoff?: ReplacementTradeoffData;
  proposedAddition?: ProposedAdditionData;
  unknownIssue?: UnknownIssueData;
  smallApplianceRepair?: SmallApplianceRepairData;
  mediumSystemRepair?: MediumSystemRepairData;
  homeEvent?: HomeEventData;
}

export interface NormalizedContent {
  cleanText: string;
  structuredData: ExtractedStructuredData;
}

// ============================================
// Execution Artifact Firewall (P0 Safety Layer)
// ============================================

/**
 * EXECUTION ARTIFACT CLASSIFICATION
 * 
 * Execution: action, action_input, tool_calls, function, arguments
 * Domain:    contractor_recommendations, system_update, replacement_tradeoff, proposed_addition
 * 
 * Policy: Strip execution unconditionally. Parse domain artifacts.
 */
const EXECUTION_KEYS = ['action', 'action_input', 'tool_calls', 'function', 'arguments'] as const;
const DOMAIN_TYPES = ['contractor_recommendations', 'system_update', 'replacement_tradeoff', 'proposed_addition', 'unknown_issue', 'small_appliance_repair', 'medium_system_repair', 'home_event_recorded'] as const;

/**
 * Strip execution artifacts from content.
 * Runs FIRST in the pipeline — before any domain extraction.
 * 
 * INVARIANT: If a JSON object contains execution keys, it is removed entirely.
 */
function stripExecutionArtifacts(content: string): string {
  let cleaned = content;
  let searchStart = 0;
  
  while (searchStart < cleaned.length) {
    // Find next JSON object candidate
    const braceIndex = cleaned.indexOf('{', searchStart);
    if (braceIndex === -1) break;
    
    const jsonStr = extractBalancedJson(cleaned, braceIndex);
    if (!jsonStr) {
      searchStart = braceIndex + 1;
      continue;
    }
    
    try {
      const parsed = JSON.parse(jsonStr);
      
      // Check if this is an execution artifact
      const isExecutionArtifact = EXECUTION_KEYS.some(key => key in parsed);
      
      // Check if this is a known domain type (whitelist)
      const isDomainArtifact = parsed.type && DOMAIN_TYPES.includes(parsed.type);
      
      if (isExecutionArtifact && !isDomainArtifact) {
        // Strip this execution artifact
        console.warn('[stripExecutionArtifacts] Removed execution artifact:', Object.keys(parsed).slice(0, 3));
        cleaned = cleaned.slice(0, braceIndex) + cleaned.slice(braceIndex + jsonStr.length);
        // Don't advance searchStart — check same position for consecutive artifacts
        continue;
      }
    } catch {
      // Not valid JSON, skip
    }
    
    searchStart = braceIndex + jsonStr.length;
  }
  
  return cleaned;
}

// ============================================
// Structured Data Extraction
// ============================================

/**
 * Build human-readable confirmation following advisor copy governance.
 * Reference: memory/style/advisor/conversational-write-confirmation
 * 
 * Required pattern: "I've saved that the [system] was [action] in [year] (owner-reported). 
 * You'll see it reflected in your system timeline."
 */
function buildSystemUpdateConfirmation(data: SystemUpdateData): string {
  const systemNames: Record<string, string> = {
    hvac: 'HVAC system',
    roof: 'roof',
    water_heater: 'water heater',
  };
  
  const systemName = systemNames[data.systemKey] || data.systemKey.replace(/_/g, ' ');
  
  if (!data.success) {
    return data.message || "I wasn't able to save that update. Please try again.";
  }
  
  if (data.alreadyRecorded) {
    return `That's already recorded. Your ${systemName} shows as ${data.installedLine || 'up to date'}.`;
  }
  
  // Extract year from installedLine if available (e.g., "Installed 2012 (original system)")
  const yearMatch = data.installedLine?.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : '';
  
  // Determine action from installedLine
  const isOriginal = data.installedLine?.toLowerCase().includes('original');
  
  let confirmation: string;
  if (year && !isOriginal) {
    confirmation = `I've saved that the ${systemName} was installed in ${year} (owner-reported). You'll see it reflected in your system timeline.`;
  } else if (isOriginal) {
    confirmation = `I've saved that the ${systemName} is original to the house (owner-reported). You'll see it reflected in your system timeline.`;
  } else {
    // Fallback to server message if we can't parse specifics
    confirmation = data.message || `I've updated your ${systemName} information. You'll see it reflected in your system timeline.`;
  }
  
  // Append post-confirmation advisory if present (Refinement #2: prose lives here, not in handler)
  if (data.postConfirmationAdvisory) {
    const advisory = buildPostConfirmationAdvisoryMessage(data.postConfirmationAdvisory);
    if (advisory) {
      confirmation += '\n\n' + advisory;
    }
  }
  
  return confirmation;
}

/**
 * Build post-confirmation advisory prose from structured facts.
 * 
 * SEPARATION OF CONCERNS: The handler (ai-home-assistant) emits structured data.
 * This function owns ALL narrative text. Copy can evolve independently of logic.
 * 
 * Confidence gating (Refinement #3): advisoryConfident gates tone, not content.
 */
function buildPostConfirmationAdvisoryMessage(advisory: PostConfirmationAdvisoryData): string {
  const parts: string[] = [];

  // Causal anchor: "Because this install date moves the system past..."
  if (advisory.tier === 'late_life' || advisory.tier === 'planning_window') {
    parts.push('Because this install date moves the system into its ' +
      (advisory.tier === 'late_life' ? 'late-life window' : 'planning window') +
      ", here's what matters next.");
  }

  // Status line (confidence-gated tone)
  if (advisory.tier === 'late_life') {
    if (advisory.advisoryConfident) {
      parts.push(`At ~${advisory.age} years old in ${advisory.climateLabel}, your ${advisory.systemLabel.toLowerCase()} is operating beyond the typical reliable window. It may continue to run, but failure risk increases at this stage.`);
    } else {
      parts.push(`Based on the information available, your ${advisory.systemLabel.toLowerCase()} at ~${advisory.age} years old may be approaching the end of its typical service life.`);
    }
  } else if (advisory.tier === 'planning_window') {
    if (advisory.advisoryConfident) {
      parts.push(`At ~${advisory.age} years old, your ${advisory.systemLabel.toLowerCase()} is entering its replacement planning window for ${advisory.climateLabel} conditions.`);
    } else {
      parts.push(`Based on the information available, your ${advisory.systemLabel.toLowerCase()} at ~${advisory.age} years old is approaching its typical planning window.`);
    }
  } else {
    // mid_life or early_life — lightweight status note only
    parts.push(advisory.statusNote ||
      `At ~${advisory.age} years old, your ${advisory.systemLabel.toLowerCase()} is well within its expected service life. Routine monitoring is sufficient.`);
    return parts.join('\n\n');
  }

  // Now actions
  if (advisory.nowActions?.length) {
    parts.push('**Now (low effort):**');
    parts.push(advisory.nowActions.map(a => `- ${a}`).join('\n'));
  }

  // Plan actions
  if (advisory.planActions?.length) {
    parts.push('**Plan ahead:**');
    parts.push(advisory.planActions.map(a => `- ${a}`).join('\n'));
  }

  // Precision CTA
  if (advisory.precisionCTA) {
    parts.push(`For more precision, you can ${advisory.precisionCTA.toLowerCase()}.`);
  }

  // Closing question
  const closingQuestions: Record<string, string> = {
    explore_costs: 'Would you like to explore replacement costs or plan next steps?',
  };
  if (advisory.closingIntent && closingQuestions[advisory.closingIntent]) {
    parts.push(closingQuestions[advisory.closingIntent]);
  }

  return parts.join('\n\n');
}

/**
 * Extract system update JSON and convert to human-readable message
 * Returns the extracted data and cleaned content
 */
function extractSystemUpdateData(content: string): {
  systemUpdate?: SystemUpdateData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  // Use balanced-brace extraction to handle nested postConfirmationAdvisory objects
  const typeMarker = '"type":"system_update"';
  const typeMarkerAlt = '"type": "system_update"';
  
  let cleanedContent = content;
  let systemUpdate: SystemUpdateData | undefined;
  let humanReadableMessage: string | undefined;
  
  let searchContent = content;
  
  while (searchContent.includes(typeMarker) || searchContent.includes(typeMarkerAlt)) {
    const markerIndex = Math.min(
      searchContent.includes(typeMarker) ? searchContent.indexOf(typeMarker) : Infinity,
      searchContent.includes(typeMarkerAlt) ? searchContent.indexOf(typeMarkerAlt) : Infinity
    );
    
    if (markerIndex === Infinity) break;
    
    // Find the opening brace before this marker
    let braceStart = markerIndex;
    while (braceStart > 0 && searchContent[braceStart] !== '{') {
      braceStart--;
    }
    
    // Find balanced closing brace (handles nested postConfirmationAdvisory)
    const jsonStr = extractBalancedJson(searchContent, braceStart);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'system_update') {
          systemUpdate = {
            success: data.success,
            systemKey: data.systemKey,
            alreadyRecorded: data.alreadyRecorded || false,
            installedLine: data.installedLine,
            confidenceLevel: data.confidenceLevel,
            message: data.message,
            reason: data.reason,
            // Pull advisory facts from tool result (Refinement #2)
            postConfirmationAdvisory: data.postConfirmationAdvisory,
          };
          
          // Build human-readable confirmation (includes advisory prose if present)
          humanReadableMessage = buildSystemUpdateConfirmation(systemUpdate);
          
          // Remove the JSON block from content
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      } catch (e) {
        console.warn('Failed to parse system update JSON:', e);
        if (jsonStr) {
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      }
    }
    
    // Move past this occurrence
    searchContent = searchContent.substring(markerIndex + 10);
  }
  
  return { systemUpdate, cleanedContent, humanReadableMessage };
}

/**
 * Extract replacement tradeoff JSON and convert to human-readable message
 */
function extractReplacementTradeoffData(content: string): {
  replacementTradeoff?: ReplacementTradeoffData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  // Look for JSON objects containing replacement_tradeoff type
  // Use a function to find balanced JSON objects
  let cleanedContent = content;
  let replacementTradeoff: ReplacementTradeoffData | undefined;
  let humanReadableMessage: string | undefined;
  
  // Find potential JSON start positions
  const typeMarker = '"type":"replacement_tradeoff"';
  const typeMarkerAlt = '"type": "replacement_tradeoff"';
  
  let searchContent = content;
  let offset = 0;
  
  while (searchContent.includes(typeMarker) || searchContent.includes(typeMarkerAlt)) {
    const markerIndex = Math.min(
      searchContent.includes(typeMarker) ? searchContent.indexOf(typeMarker) : Infinity,
      searchContent.includes(typeMarkerAlt) ? searchContent.indexOf(typeMarkerAlt) : Infinity
    );
    
    if (markerIndex === Infinity) break;
    
    // Find the opening brace before this marker
    let braceStart = markerIndex;
    while (braceStart > 0 && searchContent[braceStart] !== '{') {
      braceStart--;
    }
    
    // Find balanced closing brace
    const jsonStr = extractBalancedJson(searchContent, braceStart);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'replacement_tradeoff') {
          replacementTradeoff = data;
          humanReadableMessage = buildReplacementTradeoffMessage(data);
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      } catch (e) {
        console.warn('Failed to parse replacement tradeoff JSON:', e);
        // Remove the malformed JSON
        cleanedContent = cleanedContent.replace(jsonStr, '');
      }
    }
    
    // Move past this occurrence
    searchContent = searchContent.substring(markerIndex + 10);
    offset += markerIndex + 10;
  }
  
  return { replacementTradeoff, cleanedContent, humanReadableMessage };
}

/**
 * Extract a balanced JSON object starting from a given position
 */
function extractBalancedJson(content: string, startIndex: number): string | null {
  if (content[startIndex] !== '{') return null;
  
  let depth = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    
    if (char === '"' && !escaped) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) {
          return content.substring(startIndex, i + 1);
        }
      }
    }
  }
  
  return null;
}

/**
 * Build human-readable tradeoff message
 * Following advisor copy governance: ranges only, no urgency language
 */
function buildReplacementTradeoffMessage(data: ReplacementTradeoffData): string {
  if (!data.success) {
    return data.message || "I couldn't generate a cost comparison for that system.";
  }
  
  const formatRange = (low: number, high: number) => {
    if (low === high) return `$${low.toLocaleString()}`;
    return `$${low.toLocaleString()}–$${high.toLocaleString()}`;
  };
  
  const displayName = data.displayName || data.systemType.replace(/_/g, ' ');
  
  let message = `**Replacement Cost Tradeoff: ${displayName}**\n\n`;
  
  // Planned replacement
  if (data.plannedReplacement) {
    message += `• **${data.plannedReplacement.label}**: ${formatRange(data.plannedReplacement.low, data.plannedReplacement.high)}\n`;
  }
  
  // Emergency replacement
  if (data.emergencyReplacement) {
    message += `• **${data.emergencyReplacement.label}**: ${formatRange(data.emergencyReplacement.low, data.emergencyReplacement.high)}`;
    if (data.emergencyReplacement.premiumPercent) {
      message += ` (${data.emergencyReplacement.premiumPercent}% premium)`;
    }
    message += '\n';
  }
  
  // Tradeoff delta
  if (data.tradeoffDelta) {
    message += `• **Potential cost difference**: ${formatRange(data.tradeoffDelta.low, data.tradeoffDelta.high)}\n`;
  }
  
  // Timeline
  if (data.yearsUntilLikely !== null && data.yearsUntilLikely !== undefined) {
    message += `\n**Timeline**: Replacement likely needed in ~${data.yearsUntilLikely} years.\n`;
  }
  
  // Recommendation (neutral framing)
  if (data.recommendation) {
    message += `\n${data.recommendation}`;
  }
  
  // Disclosure note
  if (data.disclosureNote) {
    message += `\n\n_${data.disclosureNote}_`;
  }
  
  return message;
}

/**
 * Build human-readable proposed addition message
 * For new system installation estimates (not existing systems)
 */
function buildProposedAdditionMessage(data: ProposedAdditionData): string {
  if (!data.success) {
    return "I couldn't estimate costs for that system.";
  }
  
  const formatRange = (low: number, high: number) => {
    if (low === high) return `$${low.toLocaleString()}`;
    return `$${low.toLocaleString()}–$${high.toLocaleString()}`;
  };
  
  const displayName = data.displayName || data.systemType.replace(/_/g, ' ');
  const quantityNote = data.quantity && data.quantity > 1 ? ` (${data.quantity} units)` : '';
  
  let message = `**Installation Estimate: ${displayName}${quantityNote}**\n\n`;
  
  if (data.estimatedCost) {
    message += `• **${data.estimatedCost.label}**: ${formatRange(data.estimatedCost.low, data.estimatedCost.high)}\n`;
  }
  
  if (data.rushPremium) {
    message += `• **${data.rushPremium.label}**: ${formatRange(data.rushPremium.low, data.rushPremium.high)} (+${data.rushPremium.percent}%)\n`;
  }
  
  if (data.expectedLifespan) {
    message += `\n**Expected lifespan**: ~${data.expectedLifespan} years\n`;
  }
  
  if (data.recommendation) {
    message += `\n${data.recommendation}`;
  }
  
  return message;
}

/**
 * Extract proposed addition JSON and convert to human-readable message
 */
function extractProposedAdditionData(content: string): {
  proposedAddition?: ProposedAdditionData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  let cleanedContent = content;
  let proposedAddition: ProposedAdditionData | undefined;
  let humanReadableMessage: string | undefined;
  
  const typeMarker = '"type":"proposed_addition"';
  const typeMarkerAlt = '"type": "proposed_addition"';
  
  let searchContent = content;
  
  while (searchContent.includes(typeMarker) || searchContent.includes(typeMarkerAlt)) {
    const markerIndex = Math.min(
      searchContent.includes(typeMarker) ? searchContent.indexOf(typeMarker) : Infinity,
      searchContent.includes(typeMarkerAlt) ? searchContent.indexOf(typeMarkerAlt) : Infinity
    );
    
    if (markerIndex === Infinity) break;
    
    let braceStart = markerIndex;
    while (braceStart > 0 && searchContent[braceStart] !== '{') {
      braceStart--;
    }
    
    const jsonStr = extractBalancedJson(searchContent, braceStart);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'proposed_addition') {
          proposedAddition = data;
          humanReadableMessage = buildProposedAdditionMessage(data);
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      } catch (e) {
        console.warn('Failed to parse proposed addition JSON:', e);
        cleanedContent = cleanedContent.replace(jsonStr, '');
      }
    }
    
    searchContent = searchContent.substring(markerIndex + 10);
  }
  
  return { proposedAddition, cleanedContent, humanReadableMessage };
}
/**
 * Extract unknown_issue JSON and convert to human-readable message
 * Handles tool failures where the system couldn't classify the issue
 */
function extractUnknownIssueData(content: string): {
  unknownIssue?: UnknownIssueData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  let cleanedContent = content;
  let unknownIssue: UnknownIssueData | undefined;
  let humanReadableMessage: string | undefined;
  
  const typeMarker = '"type":"unknown_issue"';
  const typeMarkerAlt = '"type": "unknown_issue"';
  
  let searchContent = content;
  
  while (searchContent.includes(typeMarker) || searchContent.includes(typeMarkerAlt)) {
    const markerIndex = Math.min(
      searchContent.includes(typeMarker) ? searchContent.indexOf(typeMarker) : Infinity,
      searchContent.includes(typeMarkerAlt) ? searchContent.indexOf(typeMarkerAlt) : Infinity
    );
    
    if (markerIndex === Infinity) break;
    
    let braceStart = markerIndex;
    while (braceStart > 0 && searchContent[braceStart] !== '{') {
      braceStart--;
    }
    
    const jsonStr = extractBalancedJson(searchContent, braceStart);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'unknown_issue') {
          unknownIssue = {
            success: false,
            issueType: data.issueType,
            message: data.message,
            suggestion: data.suggestion,
          };
          
          const issueLabel = data.issueType ? data.issueType.replace(/_/g, ' ') : 'this issue';
          humanReadableMessage = `To provide accurate cost information for ${issueLabel}, I need a bit more detail about the specific problem — such as a symptom, error code, or which component is affected.`;
          
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      } catch (e) {
        console.warn('Failed to parse unknown_issue JSON:', e);
        cleanedContent = cleanedContent.replace(jsonStr, '');
      }
    }
    
    searchContent = searchContent.substring(markerIndex + 10);
  }
  
  return { unknownIssue, cleanedContent, humanReadableMessage };
}

/**
 * Extract small_appliance_repair JSON and convert to human-readable message
 */
function extractSmallApplianceData(content: string): {
  smallApplianceRepair?: SmallApplianceRepairData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  let cleanedContent = content;
  let smallApplianceRepair: SmallApplianceRepairData | undefined;
  let humanReadableMessage: string | undefined;
  
  const typeMarker = '"type":"small_appliance_repair"';
  const typeMarkerAlt = '"type": "small_appliance_repair"';
  
  let searchContent = content;
  
  while (searchContent.includes(typeMarker) || searchContent.includes(typeMarkerAlt)) {
    const markerIndex = Math.min(
      searchContent.includes(typeMarker) ? searchContent.indexOf(typeMarker) : Infinity,
      searchContent.includes(typeMarkerAlt) ? searchContent.indexOf(typeMarkerAlt) : Infinity
    );
    
    if (markerIndex === Infinity) break;
    
    let braceStart = markerIndex;
    while (braceStart > 0 && searchContent[braceStart] !== '{') {
      braceStart--;
    }
    
    const jsonStr = extractBalancedJson(searchContent, braceStart);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'small_appliance_repair') {
          smallApplianceRepair = {
            success: data.success,
            applianceType: data.applianceType,
            displayName: data.displayName,
            costRange: data.costRange,
            diyEligible: data.diyEligible,
            tradeType: data.tradeType,
            message: data.message,
          };
          
          const name = data.displayName || data.applianceType?.replace(/_/g, ' ') || 'this appliance';
          const parts: string[] = [];
          
          if (data.costRange) {
            parts.push(`Typical cost range for ${name}: $${data.costRange.min.toLocaleString()}–$${data.costRange.max.toLocaleString()}.`);
          }
          
          if (data.diyEligible === true) {
            parts.push('This is generally a manageable DIY project, though hiring a pro is always an option.');
          } else if (data.diyEligible === false && data.tradeType) {
            parts.push(`A ${data.tradeType} can typically handle this. Getting 2-3 quotes is recommended.`);
          }
          
          humanReadableMessage = parts.join(' ');
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      } catch (e) {
        console.warn('Failed to parse small_appliance_repair JSON:', e);
        cleanedContent = cleanedContent.replace(jsonStr, '');
      }
    }
    
    searchContent = searchContent.substring(markerIndex + 10);
  }
  
  return { smallApplianceRepair, cleanedContent, humanReadableMessage };
}

/**
 * Extract medium_system_repair JSON and convert to human-readable message
 */
function extractMediumSystemData(content: string): {
  mediumSystemRepair?: MediumSystemRepairData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  let cleanedContent = content;
  let mediumSystemRepair: MediumSystemRepairData | undefined;
  let humanReadableMessage: string | undefined;
  
  const typeMarker = '"type":"medium_system_repair"';
  const typeMarkerAlt = '"type": "medium_system_repair"';
  
  let searchContent = content;
  
  while (searchContent.includes(typeMarker) || searchContent.includes(typeMarkerAlt)) {
    const markerIndex = Math.min(
      searchContent.includes(typeMarker) ? searchContent.indexOf(typeMarker) : Infinity,
      searchContent.includes(typeMarkerAlt) ? searchContent.indexOf(typeMarkerAlt) : Infinity
    );
    
    if (markerIndex === Infinity) break;
    
    let braceStart = markerIndex;
    while (braceStart > 0 && searchContent[braceStart] !== '{') {
      braceStart--;
    }
    
    const jsonStr = extractBalancedJson(searchContent, braceStart);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'medium_system_repair') {
          mediumSystemRepair = {
            success: data.success,
            systemType: data.systemType,
            displayName: data.displayName,
            costRange: data.costRange,
            diyEligible: data.diyEligible,
            tradeType: data.tradeType,
            message: data.message,
          };
          
          const name = data.displayName || data.systemType?.replace(/_/g, ' ') || 'this system';
          const parts: string[] = [];
          
          if (data.costRange) {
            parts.push(`Typical cost range for ${name}: $${data.costRange.min.toLocaleString()}–$${data.costRange.max.toLocaleString()}.`);
          }
          
          if (data.tradeType) {
            parts.push(`We recommend consulting a qualified ${data.tradeType} for this work.`);
          }
          
          parts.push('Getting 2-3 quotes from licensed professionals is recommended.');
          
          humanReadableMessage = parts.join(' ');
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      } catch (e) {
        console.warn('Failed to parse medium_system_repair JSON:', e);
        cleanedContent = cleanedContent.replace(jsonStr, '');
      }
    }
    
    searchContent = searchContent.substring(markerIndex + 10);
  }
  
  return { mediumSystemRepair, cleanedContent, humanReadableMessage };
}

/**
 * Extract home_event_recorded JSON from content
 * Part of the Home Record (Carfax for the Home) system
 */
function extractHomeEventData(content: string): {
  homeEvent?: HomeEventData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  let cleanedContent = content;
  let homeEvent: HomeEventData | undefined;
  let humanReadableMessage: string | undefined;
  
  const typeMarker = '"type":"home_event_recorded"';
  const typeMarkerAlt = '"type": "home_event_recorded"';
  
  let searchContent = content;
  
  while (searchContent.includes(typeMarker) || searchContent.includes(typeMarkerAlt)) {
    const markerIndex = Math.min(
      searchContent.includes(typeMarker) ? searchContent.indexOf(typeMarker) : Infinity,
      searchContent.includes(typeMarkerAlt) ? searchContent.indexOf(typeMarkerAlt) : Infinity
    );
    
    if (markerIndex === Infinity) break;
    
    let braceStart = markerIndex;
    while (braceStart > 0 && searchContent[braceStart] !== '{') {
      braceStart--;
    }
    
    const jsonStr = extractBalancedJson(searchContent, braceStart);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'home_event_recorded') {
          homeEvent = {
            success: data.success,
            eventId: data.eventId,
            assetId: data.assetId,
            isNewAsset: data.isNewAsset,
            eventType: data.eventType,
            systemKind: data.systemKind,
            title: data.title,
            message: data.message,
            clarificationNeeded: data.clarificationNeeded,
          };
          
          // Use the message from the server (already well-formatted)
          humanReadableMessage = data.message || data.title || 'Home record updated.';
          
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      } catch (e) {
        console.warn('Failed to parse home_event_recorded JSON:', e);
        cleanedContent = cleanedContent.replace(jsonStr, '');
      }
    }
    
    searchContent = searchContent.substring(markerIndex + 10);
  }
  
  return { homeEvent, cleanedContent, humanReadableMessage };
}

/**
 * Catch-all JSON stripper (Defense in Depth)
 * Removes any remaining {"type":"..."} JSON objects that weren't caught by specific extractors.
 * This prevents future tool response types from leaking into the UI.
 */
function stripRemainingToolJson(content: string): string {
  let cleaned = content;
  let searchStart = 0;
  
  while (searchStart < cleaned.length) {
    const braceIndex = cleaned.indexOf('{', searchStart);
    if (braceIndex === -1) break;
    
    const jsonStr = extractBalancedJson(cleaned, braceIndex);
    if (!jsonStr) {
      searchStart = braceIndex + 1;
      continue;
    }
    
    try {
      const parsed = JSON.parse(jsonStr);
      
      // If it has a "type" field and looks like a tool response, strip it
      if (parsed.type && typeof parsed.type === 'string' && 
          (parsed.success !== undefined || parsed.message || parsed.costRange || parsed.issueType)) {
        console.warn('[stripRemainingToolJson] Caught unhandled tool response:', parsed.type);
        cleaned = cleaned.slice(0, braceIndex) + cleaned.slice(braceIndex + jsonStr.length);
        continue;
      }
    } catch {
      // Not valid JSON, skip
    }
    
    searchStart = braceIndex + jsonStr.length;
  }
  
  return cleaned;
}

function extractContractorData(content: string): {
  contractors?: {
    service?: string;
    disclaimer: string;
    confidence: string;
    items: ContractorRecommendation[];
    message?: string;
    suggestion?: string;
  };
  cleanedContent: string;
} {
  let cleanedContent = content;
  let contractors: {
    service?: string;
    disclaimer: string;
    confidence: string;
    items: ContractorRecommendation[];
    message?: string;
    suggestion?: string;
  } | undefined;
  
  // Find potential JSON start positions for contractor recommendations
  const typeMarker = '"type":"contractor_recommendations"';
  const typeMarkerAlt = '"type": "contractor_recommendations"';
  
  let searchContent = content;
  
  while (searchContent.includes(typeMarker) || searchContent.includes(typeMarkerAlt)) {
    const markerIndex = Math.min(
      searchContent.includes(typeMarker) ? searchContent.indexOf(typeMarker) : Infinity,
      searchContent.includes(typeMarkerAlt) ? searchContent.indexOf(typeMarkerAlt) : Infinity
    );
    
    if (markerIndex === Infinity) break;
    
    // Find the opening brace before this marker
    let braceStart = markerIndex;
    while (braceStart > 0 && searchContent[braceStart] !== '{') {
      braceStart--;
    }
    
    // Find balanced closing brace
    const jsonStr = extractBalancedJson(searchContent, braceStart);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'contractor_recommendations') {
          // Validate contractor data - support both old (specialty) and new (category) formats
          const validContractors = (data.contractors || []).filter(
            (c: unknown): c is ContractorRecommendation =>
              typeof c === 'object' &&
              c !== null &&
              typeof (c as any).name === 'string' &&
              typeof (c as any).rating === 'number' &&
              (typeof (c as any).category === 'string' || typeof (c as any).specialty === 'string')
          ).map((c: any) => ({
            name: c.name,
            rating: c.rating,
            reviewCount: c.reviewCount || 0,
            category: c.category || c.specialty || 'Contractor',
            location: c.location || c.notes || '',
            websiteUri: c.websiteUri,
            phone: c.phone
          }));
          
          contractors = {
            service: data.service,
            disclaimer: data.disclaimer || 'Sourced from Google Places. Habitta does not vet or endorse contractors.',
            confidence: data.confidence || 'discovery_only',
            items: validContractors,
            message: data.message,
            suggestion: data.suggestion
          };
          
          // Remove the JSON block from content
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      } catch (e) {
        console.warn('Failed to parse contractor JSON:', e);
        // Remove malformed JSON to prevent it from showing
        if (jsonStr) {
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      }
    }
    
    // Move past this occurrence
    searchContent = searchContent.substring(markerIndex + 10);
  }
  
  return { contractors, cleanedContent };
}

/**
 * Strip pseudo-XML artifact tags from AI responses.
 * These tags are rendered separately via dedicated components.
 */
function stripArtifactTags(content: string): string {
  let cleaned = content;
  
  // Known artifact tags to strip (self-closing, block, and bracket variants)
  const tagsToStrip = [
    'system_validation_evidence',
    'cost_impact_analysis',
    'system_aging_profile',
    'cost_range',
    'comparison_table',
    'confidence_explainer',
    'local_context',
    'local_contractor_recommendations',
    'contractor_recommendations',
  ];
  
  for (const tag of tagsToStrip) {
    // XML self-closing: <tag ... />
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/>`, 'gi');
    cleaned = cleaned.replace(selfClosingRegex, '');
    
    // XML block: <tag>...</tag>
    const blockRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(blockRegex, '');
    
    // Bracket-style function call: [tag(...)]
    // Handles nested brackets by matching balanced content
    const bracketFuncRegex = new RegExp(`\\[${tag}\\([^\\]]*(?:\\[[^\\]]*\\][^\\]]*)*\\)\\]`, 'gi');
    cleaned = cleaned.replace(bracketFuncRegex, '');
  }
  
  // Also strip any remaining pseudo-XML that looks like artifact tags
  // Pattern: <word_with_underscores ... /> or <word_with_underscores>...</word_with_underscores>
  cleaned = cleaned.replace(/<[a-z_]+[^>]*\/>/gi, '');
  cleaned = cleaned.replace(/<([a-z_]+)[^>]*>[\s\S]*?<\/\1>/gi, '');
  
  // Strip any remaining bracket-style artifact patterns
  // Pattern: [word_with_underscores(...)] with possible nested content
  cleaned = cleaned.replace(/\[[a-z_]+\([^\]]*(?:\[[^\]]*\][^\]]*)*\)\]/gi, '');
  
  return cleaned;
}

// ============================================
// Core Extraction & Sanitization
// ============================================

/**
 * Main extraction and sanitization function
 * Returns clean text AND extracted structured data
 */
export function extractAndSanitize(content: string): NormalizedContent {
  const structuredData: ExtractedStructuredData = {};
  
  // 0. FIRST: Strip execution artifacts (fail-closed firewall)
  let cleanedContent = stripExecutionArtifacts(content);
  
  // 1. Extract contractor data
  const { contractors, cleanedContent: afterContractors } = extractContractorData(cleanedContent);
  if (contractors) {
    structuredData.contractors = contractors;
  }
  
  // 2. Extract system update data
  const { systemUpdate, cleanedContent: afterSystemUpdate, humanReadableMessage: systemUpdateMsg } = extractSystemUpdateData(afterContractors);
  if (systemUpdate) {
    structuredData.systemUpdate = systemUpdate;
  }
  
  // 3. Extract replacement tradeoff data
  const { replacementTradeoff, cleanedContent: afterTradeoff, humanReadableMessage: tradeoffMsg } = extractReplacementTradeoffData(afterSystemUpdate);
  if (replacementTradeoff) {
    structuredData.replacementTradeoff = replacementTradeoff;
  }
  
  // 4. Extract proposed addition data
  const { proposedAddition, cleanedContent: afterProposed, humanReadableMessage: proposedMsg } = extractProposedAdditionData(afterTradeoff);
  if (proposedAddition) {
    structuredData.proposedAddition = proposedAddition;
  }
  
  // 5. Extract unknown issue data (tool failure normalization)
  const { unknownIssue, cleanedContent: afterUnknown, humanReadableMessage: unknownMsg } = extractUnknownIssueData(afterProposed);
  if (unknownIssue) {
    structuredData.unknownIssue = unknownIssue;
  }
  
  // 6. Extract small appliance repair data
  const { smallApplianceRepair, cleanedContent: afterSmall, humanReadableMessage: smallMsg } = extractSmallApplianceData(afterUnknown);
  if (smallApplianceRepair) {
    structuredData.smallApplianceRepair = smallApplianceRepair;
  }
  
  // 7. Extract medium system repair data
  const { mediumSystemRepair, cleanedContent: afterMedium, humanReadableMessage: mediumMsg } = extractMediumSystemData(afterSmall);
  if (mediumSystemRepair) {
    structuredData.mediumSystemRepair = mediumSystemRepair;
  }
  
  // 8. Extract home event data (Carfax for the Home)
  const { homeEvent, cleanedContent: afterHomeEvent, humanReadableMessage: homeEventMsg } = extractHomeEventData(afterMedium);
  if (homeEvent) {
    structuredData.homeEvent = homeEvent;
  }
  
  // 9. Catch-all: Strip any remaining tool JSON that slipped through (defense in depth)
  const afterCatchAll = stripRemainingToolJson(afterHomeEvent);
  
  // 10. Strip remaining artifact tags
  let cleanText = stripArtifactTags(afterCatchAll);
  
  // 11. Append human-readable messages
  const messages = [systemUpdateMsg, tradeoffMsg, proposedMsg, unknownMsg, smallMsg, mediumMsg, homeEventMsg].filter(Boolean);
  for (const msg of messages) {
    if (cleanText.trim() === '') {
      cleanText = msg!;
    } else {
      cleanText = `${cleanText.trim()}\n\n${msg}`;
    }
  }
  
  // 11. Clean up excessive whitespace
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();
  
  return { cleanText, structuredData };
}

// ============================================
// Text Normalization
// ============================================

/**
 * Parse section labels (not transform - let ReactMarkdown handle rendering)
 * Section labels are "Label:" patterns on their own lines
 * 
 * We don't wrap them in HTML since ReactMarkdown handles the prose styling.
 * This function is available for future component-based rendering.
 */
export function detectSectionLabels(text: string): string[] {
  const pattern = /(?:^|\n)([A-Z][^:\n]{2,50}:)\s*(?=\n)/gm;
  const matches = text.match(pattern);
  return matches?.map(m => m.trim()) ?? [];
}

/**
 * Parse bullet lists into structured data
 * Bullets are lines starting with • character
 * 
 * Returns array of bullet items for component rendering
 */
export function parseBulletLists(text: string): { items: string[]; startIndex: number; endIndex: number }[] {
  const lists: { items: string[]; startIndex: number; endIndex: number }[] = [];
  
  // Pattern: Consecutive lines starting with bullet character
  const pattern = /(?:^|\n)((?:•\s[^\n]+(?:\n|$))+)/g;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const bullets = match[1];
    const items = bullets
      .split('\n')
      .filter(line => line.trim().startsWith('•'))
      .map(line => line.replace(/^•\s*/, '').trim())
      .filter(item => item.length > 0);
    
    if (items.length > 0) {
      lists.push({
        items,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }
  
  return lists;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Escape HTML entities for safe rendering
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, m => map[m] || m);
}

/**
 * Check if content has any structured data worth extracting
 */
export function hasStructuredContent(content: string): boolean {
  // Check for JSON blocks
  if (/\{[\s\S]*?"type":\s*"/.test(content)) return true;
  
  // Check for pseudo-XML tags
  if (/<[a-z_]+[^>]*(?:\/?>|>[\s\S]*?<\/[a-z_]+>)/i.test(content)) return true;
  
  return false;
}
