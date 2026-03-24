import React from 'react';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConfidenceBadgeProps {
  confidence: number; // 0-1
  source?: string;
  tooltip?: string;
}

export function ConfidenceBadge({ confidence, source, tooltip }: ConfidenceBadgeProps) {
  const getVariant = (conf: number): "default" | "secondary" | "destructive" => {
    if (conf >= 0.8) return "default"; // High confidence - green
    if (conf >= 0.5) return "secondary"; // Medium confidence - amber
    return "destructive"; // Low confidence - red
  };

  const getLabel = (conf: number): string => {
    if (conf >= 0.8) return "High";
    if (conf >= 0.5) return "Med";
    return "Low";
  };

  const getTooltipText = (): string => {
    if (tooltip) return tooltip;
    
    const baseText = `${Math.round(confidence * 100)}% confidence`;
    if (source) {
      return `${baseText} from ${source}`;
    }
    return baseText;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getVariant(confidence)}
            className="text-xs gap-1 cursor-help"
          >
            {getLabel(confidence)}
            <HelpCircle className="h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}