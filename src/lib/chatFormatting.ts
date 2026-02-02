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

export interface SystemUpdateData {
  success: boolean;
  systemKey: string;
  alreadyRecorded: boolean;
  installedLine?: string;
  confidenceLevel?: string;
  message?: string;
  reason?: string;
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
}

export interface NormalizedContent {
  cleanText: string;
  structuredData: ExtractedStructuredData;
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
  
  if (year && !isOriginal) {
    return `I've saved that the ${systemName} was installed in ${year} (owner-reported). You'll see it reflected in your system timeline.`;
  }
  
  if (isOriginal) {
    return `I've saved that the ${systemName} is original to the house (owner-reported). You'll see it reflected in your system timeline.`;
  }
  
  // Fallback to server message if we can't parse specifics
  return data.message || `I've updated your ${systemName} information. You'll see it reflected in your system timeline.`;
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
  // Use a more precise pattern that matches balanced braces
  const jsonPattern = /\{[^{}]*"type"\s*:\s*"system_update"[^{}]*\}/g;
  
  let cleanedContent = content;
  let systemUpdate: SystemUpdateData | undefined;
  let humanReadableMessage: string | undefined;
  
  const matches = content.match(jsonPattern);
  if (matches) {
    for (const match of matches) {
      if (!match) continue;
      try {
        const data = JSON.parse(match);
        if (data.type === 'system_update') {
          systemUpdate = {
            success: data.success,
            systemKey: data.systemKey,
            alreadyRecorded: data.alreadyRecorded || false,
            installedLine: data.installedLine,
            confidenceLevel: data.confidenceLevel,
            message: data.message,
            reason: data.reason,
          };
          
          // Build human-readable confirmation
          humanReadableMessage = buildSystemUpdateConfirmation(systemUpdate);
          
          // Remove the JSON block from content
          cleanedContent = cleanedContent.replace(match, '');
        }
      } catch (e) {
        console.warn('Failed to parse system update JSON:', e);
        // Safely remove the match
        if (match) {
          cleanedContent = cleanedContent.replace(match, '');
        }
      }
    }
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
 * Extract structured JSON data from content
 * Looks for JSON blocks with "type": "contractor_recommendations"
 */
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
  
  // 1. Extract contractor data first (before stripping tags)
  const { contractors, cleanedContent: afterContractors } = extractContractorData(content);
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
  
  // 4. Strip remaining artifact tags
  let cleanText = stripArtifactTags(afterTradeoff);
  
  // 5. Append human-readable messages
  const messages = [systemUpdateMsg, tradeoffMsg].filter(Boolean);
  for (const msg of messages) {
    if (cleanText.trim() === '') {
      cleanText = msg!;
    } else {
      cleanText = `${cleanText.trim()}\n\n${msg}`;
    }
  }
  
  // 6. Clean up excessive whitespace
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
