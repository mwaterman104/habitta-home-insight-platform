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
  specialty: string;
  notes?: string;
  licenseVerified?: boolean;
}

export interface ExtractedStructuredData {
  contractors?: {
    service?: string;
    items: ContractorRecommendation[];
  };
}

export interface NormalizedContent {
  cleanText: string;
  structuredData: ExtractedStructuredData;
}

// ============================================
// Structured Data Extraction
// ============================================

/**
 * Extract structured JSON data from content
 * Looks for JSON blocks with "type": "contractor_recommendations"
 */
function extractContractorData(content: string): {
  contractors?: { service?: string; items: ContractorRecommendation[] };
  cleanedContent: string;
} {
  // Pattern: JSON object with type field for contractor recommendations
  const jsonPattern = /\{[\s\S]*?"type":\s*"contractor_recommendations"[\s\S]*?\}/g;
  
  let cleanedContent = content;
  let contractors: { service?: string; items: ContractorRecommendation[] } | undefined;
  
  const matches = content.match(jsonPattern);
  if (matches) {
    for (const match of matches) {
      try {
        const data = JSON.parse(match);
        if (data.type === 'contractor_recommendations' && Array.isArray(data.contractors)) {
          // Validate contractor data
          const validContractors = data.contractors.filter(
            (c: unknown): c is ContractorRecommendation =>
              typeof c === 'object' &&
              c !== null &&
              typeof (c as ContractorRecommendation).name === 'string' &&
              typeof (c as ContractorRecommendation).rating === 'number' &&
              typeof (c as ContractorRecommendation).specialty === 'string'
          );
          
          if (validContractors.length > 0) {
            contractors = {
              service: data.service,
              items: validContractors,
            };
          }
        }
        // Remove the JSON block from content
        cleanedContent = cleanedContent.replace(match, '');
      } catch (e) {
        console.warn('Failed to parse contractor JSON:', e);
        // Remove malformed JSON to prevent it from showing
        cleanedContent = cleanedContent.replace(match, '');
      }
    }
  }
  
  return { contractors, cleanedContent };
}

/**
 * Strip pseudo-XML artifact tags from AI responses.
 * These tags are rendered separately via dedicated components.
 */
function stripArtifactTags(content: string): string {
  let cleaned = content;
  
  // Known artifact tags to strip (self-closing and block variants)
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
    // Self-closing: <tag ... />
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/>`, 'gi');
    cleaned = cleaned.replace(selfClosingRegex, '');
    
    // Block: <tag>...</tag>
    const blockRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(blockRegex, '');
  }
  
  // Also strip any remaining pseudo-XML that looks like artifact tags
  // Pattern: <word_with_underscores ... /> or <word_with_underscores>...</word_with_underscores>
  cleaned = cleaned.replace(/<[a-z_]+[^>]*\/>/gi, '');
  cleaned = cleaned.replace(/<([a-z_]+)[^>]*>[\s\S]*?<\/\1>/gi, '');
  
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
  
  // 2. Strip remaining artifact tags
  let cleanText = stripArtifactTags(afterContractors);
  
  // 3. Clean up excessive whitespace
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
