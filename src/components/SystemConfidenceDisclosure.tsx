import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface SystemConfidenceDisclosureProps {
  system: SystemTimelineEntry;
}

/**
 * SystemConfidenceDisclosure - Shows data source and confidence transparently
 * 
 * Separates:
 * - Data source: permit / inferred / unknown
 * - Data quality: high / medium / low
 * - Disclosure note (roof always shows calming context)
 */
export function SystemConfidenceDisclosure({ system }: SystemConfidenceDisclosureProps) {
  const getSourceIcon = () => {
    switch (system.installSource) {
      case 'permit':
        return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
      case 'inferred':
        return <HelpCircle className="h-3.5 w-3.5 text-amber-500" />;
      case 'unknown':
        return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getSourceLabel = () => {
    switch (system.installSource) {
      case 'permit':
        return 'Verified via permit';
      case 'inferred':
        return 'Inferred from home age';
      case 'unknown':
        return 'Limited records';
    }
  };

  const getQualityBadge = () => {
    switch (system.dataQuality) {
      case 'high':
        return <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">High confidence</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Moderate confidence</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Estimated</Badge>;
    }
  };

  return (
    <div className="space-y-2 border-t border-border/50 pt-3 mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {getSourceIcon()}
          <span className="text-xs text-muted-foreground">{getSourceLabel()}</span>
        </div>
        {getQualityBadge()}
      </div>
      
      {system.installYear && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Install year</span>
          <span className="font-medium text-foreground">{system.installYear}</span>
        </div>
      )}
      
      {system.disclosureNote && (
        <p className="text-xs text-muted-foreground italic">
          {system.disclosureNote}
        </p>
      )}
      
      {/* Improvement suggestion */}
      {system.dataQuality !== 'high' && (
        <p className="text-xs text-primary/80">
          Have records? Adding documentation improves accuracy.
        </p>
      )}
    </div>
  );
}
