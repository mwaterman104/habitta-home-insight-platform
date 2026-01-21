import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChatDIYBannerProps {
  topic?: string;
  message?: string;
  /** Forecast context for personalized opening */
  context?: {
    score?: number;
    projected?: number;
    topRisk?: string;
    region?: string;
  };
  /** Visual variant: 'teal' (legacy) or 'advisor' (new) */
  variant?: 'teal' | 'advisor';
}

/**
 * ChatDIYBanner - Elevated from helper to home advisor
 * 
 * "Advisor" variant positions ChatDIY as:
 * - A live system advisor
 * - A financial co-pilot
 * - A "call your contractor brain"
 * 
 * Passes forecast context so ChatDIY can open with personalized guidance.
 */
export function ChatDIYBanner({ 
  topic, 
  message, 
  context,
  variant = 'advisor' 
}: ChatDIYBannerProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for context from URL params (passed from HomeHealthCard)
  const urlContext = {
    score: searchParams.get('score'),
    projected: searchParams.get('projected'),
    topRisk: searchParams.get('topRisk'),
    region: searchParams.get('region'),
  };

  const mergedContext = context || (urlContext.score ? {
    score: Number(urlContext.score),
    projected: Number(urlContext.projected),
    topRisk: urlContext.topRisk || undefined,
    region: urlContext.region || undefined,
  } : undefined);

  const handleClick = () => {
    const params = new URLSearchParams();
    if (topic) params.set('topic', topic);
    if (mergedContext?.score) params.set('score', String(mergedContext.score));
    if (mergedContext?.projected) params.set('projected', String(mergedContext.projected));
    if (mergedContext?.topRisk) params.set('topRisk', mergedContext.topRisk);
    if (mergedContext?.region) params.set('region', mergedContext.region);
    
    const queryString = params.toString();
    navigate(`/chatdiy${queryString ? `?${queryString}` : ''}`);
  };

  // Get contextual copy based on forecast data
  const getAdvisorCopy = () => {
    if (mergedContext?.topRisk && mergedContext.topRisk !== 'system-wear') {
      return `Explore how to address ${mergedContext.topRisk.toLowerCase()} risk`;
    }
    if (mergedContext?.projected && mergedContext?.score) {
      const decline = mergedContext.score - mergedContext.projected;
      if (decline > 10) {
        return `Understand what's driving your ${decline}-point projected decline`;
      }
    }
    return 'See how decisions affect your home over 10 years';
  };

  // Legacy teal variant
  if (variant === 'teal') {
    return (
      <button
        onClick={handleClick}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-xl flex items-center justify-between transition-colors"
      >
        <span className="font-medium">{message || "Need to take action? → See how with ChatDIY"}</span>
        <ArrowRight className="h-5 w-5" />
      </button>
    );
  }

  // New advisor variant
  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 rounded-full p-2 shrink-0">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900">
              Ask Habitta what to do next
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {message || getAdvisorCopy()}
            </div>
          </div>
          <Button 
            size="sm" 
            variant="default"
            onClick={handleClick}
            className="shrink-0"
          >
            Start <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
