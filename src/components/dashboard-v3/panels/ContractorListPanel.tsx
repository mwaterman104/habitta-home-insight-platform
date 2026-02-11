/**
 * ContractorListPanel - Scrollable list of contractor recommendations
 * 
 * Displays contractor cards from focus data with disclaimer,
 * each card clickable to navigate to contractor detail.
 * Implements back/close navigation.
 */

import { ArrowLeft, Search } from 'lucide-react';
import { useFocusState } from "@/contexts/FocusStateContext";
import { ContractorCard } from "@/components/chat/ContractorCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ContractorRecommendation } from "@/lib/chatFormatting";

interface ContractorListPanelProps {
  query: string;
  systemId?: string;
  contractors?: ContractorRecommendation[];
  disclaimer?: string;
}

export function ContractorListPanel({
  query,
  systemId,
  contractors = [],
  disclaimer = "We found these contractors in your area. These are not endorsements — compare quotes, check reviews, and ask questions before hiring.",
}: ContractorListPanelProps) {
  const { goBack } = useFocusState();

  // Derive header title from query (e.g., "irrigation repair" → "Irrigation Repair")
  const headerTitle = query
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const handleContractorClick = (contractorId: string) => {
    // Will be wired when ContractorDetailPanel is built
    console.log('Navigate to contractor detail:', contractorId);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={goBack}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">{headerTitle}</h2>
            {systemId && (
              <p className="text-xs text-muted-foreground mt-0.5">
                For your {systemId.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Disclaimer */}
          <div className="flex gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {disclaimer}
            </p>
          </div>

          {/* Contractor Cards */}
          {contractors.length > 0 ? (
            <div className="space-y-3">
              {contractors.map((contractor, idx) => (
                <button
                  key={`${contractor.name}-${idx}`}
                  onClick={() => handleContractorClick(contractor.name)}
                  className="w-full text-left transition-opacity hover:opacity-80"
                >
                  <ContractorCard {...contractor} />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No contractors found for this search.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
