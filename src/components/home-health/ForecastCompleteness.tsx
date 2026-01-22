import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ConfidenceDots } from "./ConfidenceDots";

// Labels for systems (UI owns copy)
const SYSTEM_LABELS: Record<string, string> = {
  hvac: 'HVAC',
  roof: 'Roof',
  water_heater: 'Water heater'
};

// Labels for factors (UI owns copy)
const FACTOR_LABELS: Record<string, string> = {
  install_year: 'install date',
  replacement_year: 'replacement year',
  service_history: 'service history',
  brand_model: 'brand/model',
  material: 'material type'
};

// Routes derived in UI, not from backend
const FACTOR_ROUTES: Record<string, string> = {
  hvac: '/system/hvac',
  roof: '/system/roof',
  water_heater: '/system/water_heater'
};

interface ForecastCompletenessProps {
  percentage: number;
  // NEW: Per-system confidence (numeric, UI derives dots)
  systemConfidence?: {
    hvac: { confidence_0_1: number };
    roof: { confidence_0_1: number };
    water_heater: { confidence_0_1: number };
  };
  // NEW: Missing factors with raw deltas (UI formats)
  missingFactorsBySystem?: Array<{
    system: 'hvac' | 'roof' | 'water_heater';
    factor: string;
    confidenceDelta: number;
  }>;
  // Legacy support
  missingFactors?: Array<{ 
    label: string; 
    impactLabel: string;
    ctaRoute?: string; 
  }>;
  summary?: string;
}

/**
 * ForecastCompleteness → RENAMED: "Prediction confidence"
 * 
 * IMPORTANT: 
 * - Missing factor impacts are ILLUSTRATIVE, not additive
 * - Language uses "up to ~X%" to avoid false precision
 * - System confidence shows breakdown per structural system
 */
export function ForecastCompleteness({ 
  percentage, 
  systemConfidence,
  missingFactorsBySystem,
  missingFactors = []
}: ForecastCompletenessProps) {
  const navigate = useNavigate();

  // Use new system-specific missing factors if available, else fall back to legacy
  const hasNewFormat = missingFactorsBySystem && missingFactorsBySystem.length > 0;

  // First CTA route for consolidated action
  const firstCtaRoute = hasNewFormat 
    ? FACTOR_ROUTES[missingFactorsBySystem![0]?.system]
    : missingFactors.find(f => f.ctaRoute)?.ctaRoute;

  return (
    <div className="space-y-3">
      {/* Header - RENAMED from "Forecast accuracy" */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Prediction confidence:</span>
        <span className="font-semibold">{percentage}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* NEW: System confidence breakdown with dots */}
      {systemConfidence && (
        <div className="space-y-1.5 mt-3">
          <p className="text-xs text-muted-foreground font-medium">
            Systems contributing to confidence
          </p>
          {Object.entries(systemConfidence).map(([system, data]) => (
            <div key={system} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{SYSTEM_LABELS[system] || system}</span>
              <ConfidenceDots confidence_0_1={data.confidence_0_1} />
            </div>
          ))}
        </div>
      )}
      
      {/* Missing factors - use new format if available */}
      {hasNewFormat ? (
        <div className="space-y-2 mt-3">
          <p className="text-xs text-muted-foreground">
            Improve confidence by adding:
          </p>
          
          {missingFactorsBySystem!.slice(0, 4).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {SYSTEM_LABELS[item.system]} {FACTOR_LABELS[item.factor] || item.factor}
              </span>
              <span className="text-green-700 font-medium">
                +{Math.round(item.confidenceDelta * 100)}%
              </span>
            </div>
          ))}
          
          {/* CTA - route derived in UI */}
          {firstCtaRoute && (
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-xs"
              onClick={() => navigate(firstCtaRoute)}
            >
              Add missing info →
            </Button>
          )}
          
          <p className="text-[10px] text-muted-foreground pt-1">
            Improves confidence — does not affect your current score.
          </p>
        </div>
      ) : missingFactors.length > 0 && (
        <div className="space-y-2">
          {/* Legacy: Intro line */}
          <p className="text-xs text-muted-foreground">
            Add a few details to sharpen long-term predictions:
          </p>
          
          {/* Legacy: Missing factors list */}
          {missingFactors.map((factor, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{factor.label}</span>
              <span className="text-green-700 font-medium">{factor.impactLabel}</span>
            </div>
          ))}
          
          {/* Legacy: Consolidated CTA */}
          {firstCtaRoute && (
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-xs"
              onClick={() => navigate(firstCtaRoute)}
            >
              Add missing info →
            </Button>
          )}
          
          {/* Footer microcopy */}
          <p className="text-[10px] text-muted-foreground pt-1">
            Improves accuracy — does not affect your current score.
          </p>
        </div>
      )}
    </div>
  );
}
