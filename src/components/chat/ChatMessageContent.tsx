/**
 * ChatMessageContent - Smart message renderer
 * 
 * NORMALIZATION LAYER ORCHESTRATOR
 * 
 * This component:
 * 1. Extracts structured data (contractors, home events, etc.)
 * 2. Sanitizes artifact tags
 * 3. Renders structured components FIRST (Validation First pattern)
 * 4. Renders remaining text via ReactMarkdown
 */

import ReactMarkdown from 'react-markdown';
import { extractAndSanitize } from '@/lib/chatFormatting';
import { ContractorRecommendations } from './ContractorRecommendations';
import { HomeEventConfirmation } from './HomeEventConfirmation';

interface ChatMessageContentProps {
  content: string;
}

export function ChatMessageContent({ content }: ChatMessageContentProps) {
  // 1. Extract structured data and sanitize
  const { cleanText, structuredData } = extractAndSanitize(content);
  
  // 2. Check if we have any content to render
  const hasStructured = !!structuredData.contractors || !!structuredData.homeEvent;
  const hasText = cleanText.trim().length > 0;
  
  if (!hasStructured && !hasText) {
    return null;
  }
  
  return (
    <div className="space-y-3">
      {/* Structured components FIRST (Validation First pattern) */}
      {structuredData.contractors && (
        <ContractorRecommendations
          service={structuredData.contractors.service}
          disclaimer={structuredData.contractors.disclaimer}
          contractors={structuredData.contractors.items}
          message={structuredData.contractors.message}
          suggestion={structuredData.contractors.suggestion}
        />
      )}
      
      {/* Home Record confirmation (quiet bookkeeping) */}
      {structuredData.homeEvent && (
        <HomeEventConfirmation event={structuredData.homeEvent} />
      )}
      
      {/* Prose content via ReactMarkdown */}
      {hasText && (
        <div className="prose prose-sm prose-stone dark:prose-invert max-w-none [&>p]:my-2 [&>ul]:my-2 [&>ol]:my-2 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
          <ReactMarkdown>{cleanText}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
