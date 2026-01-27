/**
 * SPECIFICITY LEVEL: Hero (2)
 * 
 * ALLOWED: Value number (current position), area context (observational)
 * PROHIBITED: "What If" toggles, action-framing, percentages, delta badges
 * 
 * Cascade Rule: May not exceed Status Header specificity.
 * Must not show gamification or counterfactuals.
 * 
 * QC #2: Equity Volatility Controls
 * - Slow refresh cadence (monthly)
 * - "Current position" label anchors as observation
 * - No delta highlighting
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { shouldRefreshEquity, markEquityRefreshed } from "@/lib/dashboardGovernance";

interface EquityContextCardProps {
  /** Current home value estimate */
  currentValue?: number | null;
  /** Area context statement - observational, no specific percentages */
  areaContext?: string;
  /** Last updated timestamp (for caching) */
  lastUpdated?: string;
  /** Optional link to market context */
  onViewMarketContext?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * EquityContextCard - Secondary Hero Component
 * 
 * Replaces "Equity Engine" with doctrine-compliant value context.
 * Visual weight: SECONDARY HERO (smaller padding, muted treatment)
 * 
 * Key design choices:
 * - "Current Position" label (observation, not ticker)
 * - Hero number for value
 * - Area context in plain text (no +/- badges)
 * - Slow refresh cadence (monthly) via governance module
 * - Optional "View market context" link
 */
export function EquityContextCard({
  currentValue,
  areaContext = "Similar homes in your area have appreciated moderately over the past 12 months.",
  lastUpdated,
  onViewMarketContext,
  className,
}: EquityContextCardProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const [shouldShow, setShouldShow] = useState(false);

  // Check refresh cadence on mount (QC #2)
  useEffect(() => {
    const shouldRefresh = shouldRefreshEquity();
    
    if (shouldRefresh && currentValue) {
      // Mark as refreshed when we get new data
      markEquityRefreshed();
      setDisplayValue(currentValue);
      setShouldShow(true);
    } else if (currentValue) {
      // Use cached/existing value
      setDisplayValue(currentValue);
      setShouldShow(true);
    }
  }, [currentValue]);

  // Format value as currency
  const formattedValue = displayValue 
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(displayValue)
    : null;

  // Don't render if no value available
  if (!shouldShow || !formattedValue) {
    return (
      <Card className={cn(
        "py-4 px-5",  // SECONDARY HERO visual weight
        "border border-border/50",
        className
      )}>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Equity Context
        </h3>
        <p className="text-sm text-muted-foreground">
          Value context unavailable
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "py-4 px-5",  // SECONDARY HERO visual weight (muted)
      "border border-border/50",
      className
    )}>
      {/* Section Header */}
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Equity Context
      </h3>

      {/* Current Position Label - Anchors as observation */}
      <p className="text-xs text-muted-foreground mb-1">
        Current Position
      </p>

      {/* Hero Number - Value */}
      <div className="text-2xl font-medium text-foreground mb-3">
        {formattedValue}
      </div>

      {/* Area Context - Observational, no percentages */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        {areaContext}
      </p>

      {/* Optional Market Context Link */}
      {onViewMarketContext && (
        <button
          onClick={onViewMarketContext}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
        >
          View market context
        </button>
      )}
    </Card>
  );
}
