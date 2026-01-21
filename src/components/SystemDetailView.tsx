import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertTriangle, Info, Wrench, Clock } from "lucide-react";
import type { SystemPrediction } from "@/types/systemPrediction";
import { ChatDIYBanner } from "@/components/ChatDIYBanner";
import { LifespanProgressBar } from "@/components/LifespanProgressBar";
import { 
  formatReplacementWindow, 
  formatMostLikelyYear, 
  mapConfidenceLabel,
  formatAge,
  generateWindowExplanation
} from "@/utils/lifespanFormatters";

interface SystemDetailViewProps {
  prediction: SystemPrediction;
  onBack: () => void;
  onActionComplete?: (actionSlug: string) => void;
}

/**
 * SystemDetailView - Full HVAC prediction detail display
 * CRITICAL: All copy comes from prediction object, UI just renders
 */
export function SystemDetailView({ 
  prediction, 
  onBack,
  onActionComplete 
}: SystemDetailViewProps) {
  const getStatusIcon = () => {
    switch (prediction.status) {
      case 'low':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'moderate':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadgeColor = () => {
    switch (prediction.status) {
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'moderate':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const getForecastBgColor = () => {
    switch (prediction.forecast.state) {
      case 'reassuring':
        return 'bg-green-50 border-green-100';
      case 'watch':
        return 'bg-amber-50 border-amber-100';
      case 'urgent':
        return 'bg-red-50 border-red-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onBack}
        className="flex items-center gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {getStatusIcon()}
            {prediction.header.name}
          </h1>
          <p className="text-muted-foreground mt-1">{prediction.header.installedLine}</p>
        </div>
        <Badge variant="outline" className={getStatusBadgeColor()}>
          {prediction.header.statusLabel}
        </Badge>
      </div>

      {/* What to Expect Section */}
      <Card className={`rounded-xl border ${getForecastBgColor()}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{prediction.forecast.headline}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-gray-800">{prediction.forecast.summary}</p>
          {prediction.forecast.reassurance && (
            <p className="text-sm text-muted-foreground">{prediction.forecast.reassurance}</p>
          )}
        </CardContent>
      </Card>

      {/* System Lifespan Outlook - NEW */}
      {prediction.lifespan && (
        <Card className="rounded-xl border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              System Lifespan Outlook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current age - USE PROVIDED DATA */}
            <p className="text-sm text-muted-foreground">
              Current age: {formatAge(prediction.lifespan.install_date)}
            </p>
            
            {/* Main prediction */}
            <div>
              <p className="font-medium text-gray-900">
                Expected replacement window: {formatReplacementWindow(prediction.lifespan.p10_failure_date, prediction.lifespan.p90_failure_date)}
              </p>
              <p className="text-sm text-muted-foreground">
                Most likely: {formatMostLikelyYear(prediction.lifespan.p50_failure_date)}
              </p>
            </div>
            
            {/* Progress bar */}
            <LifespanProgressBar
              installDate={prediction.lifespan.install_date}
              p10Date={prediction.lifespan.p10_failure_date}
              p50Date={prediction.lifespan.p50_failure_date}
              p90Date={prediction.lifespan.p90_failure_date}
              currentAge={prediction.lifespan.current_age_years}
            />
            
            {/* Confidence */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Estimate confidence:</span>
              <Badge variant="outline" className="text-xs">
                {mapConfidenceLabel(prediction.lifespan.confidence_0_1)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Confidence reflects data completeness — not system condition.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Low-risk reassurance card */}
      {prediction.status === 'low' && (
        <Card className="rounded-xl border-gray-100 bg-gray-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">
              No action needed right now. We'll alert you if conditions change or when it's time for seasonal review.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Why Section */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            {prediction.status === 'low' ? 'Why low risk' : "Why we're showing this"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {prediction.why.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                {bullet}
              </li>
            ))}
          </ul>
          {prediction.why.sourceLabel && (
            <p className="text-xs text-muted-foreground mt-3 italic">{prediction.why.sourceLabel}</p>
          )}
        </CardContent>
      </Card>

      {/* Factors Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {prediction.factors.helps.length > 0 && (
          <Card className="rounded-xl bg-green-50/50 border-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800">What's Helping</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {prediction.factors.helps.map((item, index) => (
                  <li key={index} className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {prediction.factors.hurts.length > 0 && (
          <Card className="rounded-xl bg-amber-50/50 border-amber-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800">Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {prediction.factors.hurts.map((item, index) => (
                  <li key={index} className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions Section (max 2) */}
      {prediction.actions.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prediction.actions.map((action, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  action.priority === 'high' 
                    ? 'border-amber-200 bg-amber-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">{action.title}</p>
                  <p className="text-sm text-muted-foreground">{action.metaLine}</p>
                </div>
                <Button 
                  variant={action.priority === 'high' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onActionComplete?.(action.chatdiySlug)}
                >
                  {action.diyOrPro === 'DIY' ? 'View Guide' : 'Find Pro'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Planning Section (only shown if remainingYears <= 3) */}
      {prediction.planning && (
        <Card className="rounded-xl border-blue-100 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-blue-800">Planning Ahead</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700">{prediction.planning.text}</p>
          </CardContent>
        </Card>
      )}

      {/* History Section */}
      {prediction.history && prediction.history.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Maintenance History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {prediction.history.map((event, index) => (
                <li key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{event.description}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(event.date).toLocaleDateString()} · {event.source}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ChatDIY Handoff */}
      <ChatDIYBanner 
        topic={prediction.actions[0]?.chatdiySlug} 
        message="Need help with any of these actions?"
      />
    </div>
  );
}
