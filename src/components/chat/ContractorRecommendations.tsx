/**
 * ContractorRecommendations - Container for contractor cards
 * 
 * Renders a section with header and grid of contractor cards.
 * Matches Habitta's calm artifact styling.
 */

import { ClipboardList } from 'lucide-react';
import { ContractorCard } from './ContractorCard';
import type { ContractorRecommendation } from '@/lib/chatFormatting';

interface ContractorRecommendationsProps {
  service?: string;
  contractors: ContractorRecommendation[];
}

export function ContractorRecommendations({
  service,
  contractors,
}: ContractorRecommendationsProps) {
  if (!contractors || contractors.length === 0) {
    return null;
  }
  
  return (
    <section className="my-3" aria-label="Contractor Recommendations">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground text-sm">
          {service ? `Local ${service} Contractors` : 'Recommended Contractors'}
        </h3>
      </div>
      
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
