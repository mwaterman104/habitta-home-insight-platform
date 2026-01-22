import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HomeForecast } from "@/types/systemPrediction";
import { 
  DualPathForecast, 
  ForecastCompleteness, 
  SilentRiskCallout, 
  FinancialAnchor 
} from "./home-health";

interface HomeHealthCardProps {
  forecast?: HomeForecast;
  // Legacy props for backward compatibility
  overallScore?: number;
  systemsNeedingAttention?: number;
  lastUpdated?: string;
  scoreDrivers?: string;
  whyExpanded?: boolean;
  onToggleWhy?: () => void;
  whyBullets?: string[];
  confidenceScore?: number;
  // New props
  onProtectClick?: () => void;
}

/**
 * HomeHealthCard - Conversion-optimized trajectory display
 * 
 * Key principles:
 * - Trajectory > Snapshot (85 → 72)
 * - Maintenance slows decay, doesn't reverse it
 * - Progressive disclosure to avoid CTA overload
 * - Probabilistic language ("Typical for homes like yours")
 */
export function HomeHealthCard({ 
  forecast,
  // Legacy props
  overallScore = 82,
  systemsNeedingAttention = 0,
  lastUpdated,
  scoreDrivers,
  whyExpanded: legacyWhyExpanded = false,
  onToggleWhy,
  whyBullets = [],
  confidenceScore,
  onProtectClick,
}: HomeHealthCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  // If no forecast provided, render legacy card
  if (!forecast) {
    return <LegacyHomeHealthCard 
      overallScore={overallScore}
      systemsNeedingAttention={systemsNeedingAttention}
      lastUpdated={lastUpdated}
      scoreDrivers={scoreDrivers}
      whyExpanded={legacyWhyExpanded}
      onToggleWhy={onToggleWhy}
      whyBullets={whyBullets}
      confidenceScore={confidenceScore}
    />;
  }

  const { 
    currentScore, 
    ifLeftUntracked, 
    withHabittaCare,
    forecastCompleteness,
    silentRisks,
    financialOutlook,
    trajectoryQualifier,
    // New multi-system transparency fields
    systemConfidence,
    missingFactorsBySystem,
    quietlyMonitored,
    financialAttribution
  } = forecast;

  // Determine score colors
  const getCurrentScoreColor = () => {
    if (currentScore >= 80) return 'text-green-700';
    if (currentScore >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const handleProtectClick = () => {
    if (onProtectClick) {
      onProtectClick();
    } else {
      // Default: navigate to ChatDIY with context
      const params = new URLSearchParams({
        topic: 'protection-plan',
        score: String(currentScore),
        projected: String(ifLeftUntracked.score24mo),
        topRisk: silentRisks[0]?.component || 'system-wear',
        region: financialOutlook.region
      });
      navigate(`/chatdiy?${params.toString()}`);
    }
  };

  return (
    <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border-0 shadow-sm">
      <CardContent className="p-6 space-y-4">
        
        {/* 1. Trajectory Headline with Tooltip */}
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Home Health Forecast
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="focus:outline-none">
                    <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3">
                  <p className="text-sm">
                    This forecast reflects patterns observed across similar homes in your area.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Score trajectory: Current → Projected */}
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-5xl font-bold ${getCurrentScoreColor()}`}>
              {currentScore}
            </span>
            <span className="text-2xl text-muted-foreground">→</span>
            <span className="text-3xl font-semibold text-amber-600">
              {ifLeftUntracked.score24mo}
            </span>
          </div>
          
          {/* Trajectory qualifier - probabilistic language */}
          <p className="text-sm text-muted-foreground mt-1">
            {trajectoryQualifier}
          </p>
        </div>
        
        {/* 2. Control Subheadline */}
        <p className="text-gray-700">
          With Habitta Care, your home stays stable and predictable at{' '}
          <strong className="text-green-700">
            {withHabittaCare.score12mo}–{withHabittaCare.score24mo}
          </strong>.
          <br />
          <span className="text-sm text-muted-foreground">
            If left untracked, gradual wear accumulates — often unnoticed.
          </span>
        </p>
        
        {/* 3. Dual-Path Visual */}
        <DualPathForecast 
          current={currentScore}
          withCare={[withHabittaCare.score12mo, withHabittaCare.score24mo]}
          ifUntracked={[ifLeftUntracked.score12mo, ifLeftUntracked.score24mo]}
        />
        
        {/* 4. Primary CTA - Always visible */}
        <div className="text-center">
          <Button 
            onClick={handleProtectClick} 
            className="w-full bg-primary hover:bg-primary/90"
          >
            What should I do next?
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Based on your home's forecast
          </p>
        </div>
        
        {/* 5. Expand for details - Progressive disclosure */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              Hide details
              <ChevronUp className="h-4 w-4 ml-1" />
            </>
          ) : (
            <>
              See what affects my forecast
              <ChevronDown className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
        
        {/* EXPANDED SECTION - Only on demand (progressive disclosure) */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
            {/* Prediction confidence with system-based breakdown */}
            <ForecastCompleteness 
              {...forecastCompleteness} 
              systemConfidence={systemConfidence}
              missingFactorsBySystem={missingFactorsBySystem}
            />
            
            {/* Quietly monitored items - subcomponents + secondary systems */}
            {quietlyMonitored && (
              <SilentRiskCallout quietlyMonitored={quietlyMonitored} />
            )}
            
            {/* Financial anchor with system attribution */}
            <FinancialAnchor 
              {...financialOutlook} 
              financialAttribution={financialAttribution}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * LegacyHomeHealthCard - Backward compatible version
 * Used when no HomeForecast is provided
 */
function LegacyHomeHealthCard({ 
  overallScore, 
  systemsNeedingAttention,
  lastUpdated,
  scoreDrivers,
  whyExpanded = false,
  onToggleWhy,
  whyBullets = [],
  confidenceScore
}: Omit<HomeHealthCardProps, 'forecast' | 'onProtectClick'>) {
  const navigate = useNavigate();
  
  const getScoreColor = () => {
    if (overallScore && overallScore >= 80) return 'text-green-700';
    if (overallScore && overallScore >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getMessage = () => {
    if (systemsNeedingAttention === 0) {
      return "Your home is in great shape. No systems need immediate attention.";
    }
    if (systemsNeedingAttention === 1) {
      return "Your home is in good shape. One system needs attention this year.";
    }
    return `Your home is in good shape. ${systemsNeedingAttention} systems need attention this year.`;
  };

  return (
    <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-medium">
          Home Health
        </div>
        <div className={`text-5xl font-bold mb-3 ${getScoreColor()}`}>
          {overallScore}
        </div>
        <p className="text-gray-700 mb-3 leading-relaxed">
          {getMessage()}
        </p>
        {onToggleWhy && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto font-medium"
            onClick={onToggleWhy}
          >
            See why your home is doing well 
            {whyExpanded ? (
              <ChevronDown className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1 rotate-[-90deg]" />
            )}
          </Button>
        )}
        
        {whyExpanded && whyBullets.length > 0 && (
          <div className="mb-3 pt-3 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
            <ul className="space-y-1.5 text-sm text-gray-600">
              {whyBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto mt-2 text-xs text-muted-foreground"
              onClick={() => navigate('/system/hvac')}
            >
              View full HVAC details →
            </Button>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          {lastUpdated ? `Updated ${lastUpdated}` : 'Updated today'} · Based on permits, maintenance, and local conditions
        </p>
        {scoreDrivers && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            Driven primarily by {scoreDrivers}.
          </p>
        )}
        {confidenceScore !== undefined && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Data confidence</span>
              <span className="font-medium">{confidenceScore}%</span>
            </div>
            <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
