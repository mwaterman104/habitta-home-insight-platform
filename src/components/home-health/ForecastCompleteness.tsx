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
  missingFactors, 
  summary 
}: ForecastCompletenessProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{summary}</span>
        <span className="font-semibold">{percentage}%</span>
      </div>
      
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {missingFactors.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs text-muted-foreground">
            Missing data that could improve accuracy:
          </p>
          {missingFactors.map((factor, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{factor.label}</span>
              <div className="flex items-center gap-2">
                {/* Illustrative language - avoids false precision */}
                <span className="text-amber-600 italic">{factor.impactLabel}</span>
                {factor.ctaRoute && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-xs"
                    onClick={() => navigate(factor.ctaRoute!)}
                  >
                    Add →
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
