/**
 * Service Options Panel (Stub)
 * 
 * CANONICAL DOCTRINE:
 * This is support, not shopping.
 * 
 * Shows service provider options when:
 * - User explicitly asks for options
 * - Baseline is complete
 * - Mode is planning or elevated
 * 
 * Visual Rules:
 * - Maximum 3 options
 * - No logos, no marketing
 * - Plain text with cost ranges
 * - Always dismissible
 * - Not styled as artifact (this is an offer, not evidence)
 * 
 * Risk 2 fix: Uses bg-muted/10 for subordinate visual weight
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProOption } from '@/types/prosAndLogistics';
import { MAX_SERVICE_OPTIONS } from '@/types/prosAndLogistics';

interface ServiceOptionsPanelProps {
  systemKey: string;
  options: ProOption[];
  onDismiss: () => void;
  onSelect: (optionId: string) => void;
}

export function ServiceOptionsPanel({ 
  systemKey: _systemKey, 
  options, 
  onDismiss, 
  onSelect 
}: ServiceOptionsPanelProps) {
  // Cap at max options
  const displayOptions = options.slice(0, MAX_SERVICE_OPTIONS);
  
  if (displayOptions.length === 0) {
    return null;
  }
  
  return (
    // Risk 2 fix: Subordinate visual weight with bg-muted/10
    <div className="my-3 p-3 rounded-lg border border-border/30 bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          Options for your consideration
        </span>
        <button 
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss options"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Options */}
      <div className="space-y-2">
        {displayOptions.map(option => (
          <div 
            key={option.id}
            className="flex items-center justify-between p-2 rounded bg-background/50 hover:bg-background transition-colors"
          >
            <div>
              <p className="text-sm font-medium">{option.name}</p>
              <p className="text-xs text-muted-foreground">{option.summary}</p>
              {option.costRange && (
                <p className="text-xs text-muted-foreground">
                  ${option.costRange.low.toLocaleString()} - ${option.costRange.high.toLocaleString()}
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onSelect(option.id)}
            >
              Learn more
            </Button>
          </div>
        ))}
      </div>
      
      {/* Always-available dismissal */}
      <div className="mt-3 text-center">
        <button 
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
