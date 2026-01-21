import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ForecastCompletenessProps {
  percentage: number;
  missingFactors: Array<{ 
    label: string; 
    impactLabel: string;  // Illustrative, e.g. "up to ~18%"
    ctaRoute?: string; 
  }>;
  summary: string;
}

/**
 * ForecastCompleteness - Replaces passive "confidence" with actionable completeness
 * 
 * IMPORTANT: Missing factor impacts are ILLUSTRATIVE, not additive
 * Language uses "up to ~X%" to avoid false precision
 */
export function ForecastCompleteness({ 
  percentage, 
  missingFactors 
}: ForecastCompletenessProps) {
  const navigate = useNavigate();

  // Find the first CTA route for consolidated action
  const firstCtaRoute = missingFactors.find(f => f.ctaRoute)?.ctaRoute;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">Forecast accuracy:</span>
        <span className="font-semibold">{percentage}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {missingFactors.length > 0 && (
        <div className="space-y-2">
          {/* Intro line */}
          <p className="text-xs text-muted-foreground">
            Add a few details to sharpen long-term predictions:
          </p>
          
          {/* Missing factors list */}
          {missingFactors.map((factor, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{factor.label}</span>
              <span className="text-green-700 font-medium">{factor.impactLabel}</span>
            </div>
          ))}
          
          {/* Consolidated CTA */}
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
