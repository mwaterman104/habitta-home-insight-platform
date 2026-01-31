/**
 * ContractorRecommendations - Container for contractor cards
 * 
 * TRUST DOCTRINE: Discovery aid, not endorsement engine.
 * 
 * Required guardrails:
 * - Mandatory disclaimer is ALWAYS visible
 * - Header says "Local contractor options" NOT "Recommended"
 * - No numbering, no "top/best" language
 * - Empty state handled gracefully with message
 */

import { Search } from 'lucide-react';
import { ContractorCard } from './ContractorCard';
import type { ContractorRecommendation } from '@/lib/chatFormatting';

interface ContractorRecommendationsProps {
  service?: string;
  disclaimer: string;
  contractors: ContractorRecommendation[];
  message?: string;
  suggestion?: string;
}

export function ContractorRecommendations({
  disclaimer,
  contractors,
  message,
  suggestion,
}: ContractorRecommendationsProps) {
  // Empty state
  if (!contractors || contractors.length === 0) {
    if (!message) return null;
    
    return (
      <section className="my-3 p-4 bg-muted/50 rounded-lg" aria-label="Contractor Search Results">
        <p className="text-sm text-muted-foreground">{message}</p>
        {suggestion && (
          <p className="text-sm text-muted-foreground mt-1">{suggestion}</p>
        )}
      </section>
    );
  }
  
  return (
    <section className="my-3" aria-label="Local Contractor Options">
      {/* Neutral header — no "Recommended" */}
      <div className="flex items-center gap-2 mb-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground text-sm">
          Local contractor options
        </h3>
      </div>
      
      {/* Mandatory disclaimer — ALWAYS visible */}
      <p className="text-xs text-muted-foreground mb-3">
        {disclaimer}
      </p>
      
      {/* Cards Grid - 2 columns on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {contractors.map((contractor, index) => (
          <ContractorCard
            key={`${contractor.name}-${index}`}
            {...contractor}
          />
        ))}
      </div>
    </section>
  );
}
