/**
 * SPECIFICITY LEVEL: Hero (2)
 * 
 * ALLOWED: Value number (softened), posture label, enablement statement, confidence text
 * PROHIBITED: Raw debt numbers, equity math, percentages, action CTAs, "What If" toggles
 * 
 * Cascade Rule: May not exceed Status Header specificity.
 * Must not show gamification or counterfactuals.
 * 
 * QC #2: Equity Volatility Controls
 * - Slow refresh cadence (monthly)
 * - "Current Position" label anchors as observation
 * - No delta highlighting
 * 
 * NOTE: Detailed equity math and scenario modeling
 * is intentionally deferred to chat and planning views
 * to preserve doctrine compliance.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { shouldRefreshEquity, markEquityRefreshed } from "@/lib/dashboardGovernance";
import { 
  formatSoftenedValue,
  type FinancingPosture, 
  type EquityConfidence 
} from "@/lib/equityPosition";
import {
  getMarketContextLabel,
  getFinancingPostureLabel,
  getEnablementLabel,
  getEquityEnablementLine,
  getConfidenceText,
  getAreaContextLine,
  getValueUnavailableText,
  getViewMarketContextText,
} from "@/lib/equityCopy";

interface EquityPositionCardProps {
  /** Current market value estimate */
  marketValue: number | null;
  /** Derived financing posture (from deriveFinancingPosture) */
  financingPosture: FinancingPosture | null;
  /** Data confidence level */
  confidence: EquityConfidence;
  /** City for area context */
  city?: string | null;
  /** State for area context */
  state?: string | null;
  /** Handler for viewing market context */
  onViewMarketContext?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * EquityPositionCard - Secondary Hero Component
 * 
 * 3-layer structure (doctrine-compliant):
 * 1. Market Context - Softened value with ~ prefix
 * 2. Financing Posture - Qualitative label only
 * 3. What This Enables - Advisory without action
 * 
 * Visual weight: SECONDARY HERO (smaller padding, muted treatment)
 */
export function EquityPositionCard({
  marketValue,
  financingPosture,
  confidence,
  city,
  state,
  onViewMarketContext,
  className,
}: EquityPositionCardProps) {
  const [shouldShow, setShouldShow] = useState(false);
  const [displayValue, setDisplayValue] = useState<string | null>(null);

  // Check refresh cadence on mount (QC #2)
  useEffect(() => {
    const shouldRefresh = shouldRefreshEquity();
    
    if (shouldRefresh && marketValue) {
      markEquityRefreshed();
    }
    
    if (marketValue) {
      setDisplayValue(formatSoftenedValue(marketValue));
      setShouldShow(true);
    }
  }, [marketValue]);

  // Empty state: no market value available
  if (!shouldShow || !displayValue) {
    return (
      <Card className={cn(
        "py-4 px-5",  // SECONDARY HERO visual weight
        "border border-border/50",
        className
      )}>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Equity Position
        </h3>
        <p className="text-sm text-muted-foreground">
          {getValueUnavailableText()}
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
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Equity Position
      </h3>

      {/* Layer 1: Market Context */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">
          {getMarketContextLabel()}
        </p>
        <div className="text-2xl font-medium text-foreground">
          {displayValue}
        </div>
      </div>

      {/* Layer 2: Financing Posture */}
      {financingPosture && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">
            {getFinancingPostureLabel()}
          </p>
          <div className="text-sm font-medium text-foreground">
            {financingPosture}
          </div>
        </div>
      )}

      {/* Layer 3: What This Enables */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">
          {getEnablementLabel()}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {getEquityEnablementLine(financingPosture)}
        </p>
      </div>

      {/* Area Context (observational) */}
      <p className="text-xs text-muted-foreground mb-3">
        {getAreaContextLine(city, state)}
      </p>

      {/* Confidence Indicator (quiet, always present) */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {getConfidenceText(confidence)}
        </span>
        
        {/* Optional Market Context Link */}
        {onViewMarketContext && (
          <button
            onClick={onViewMarketContext}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            {getViewMarketContextText()}
          </button>
        )}
      </div>
    </Card>
  );
}
