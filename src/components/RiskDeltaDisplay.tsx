import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react';

interface RiskDeltaDisplayProps {
  systemType: string;
  before: {
    score: number;
    failureProbability12mo?: number;
    monthsRemaining?: number;
  };
  after: {
    score: number;
    failureProbability12mo?: number;
    monthsRemaining?: number;
  };
  completedDate?: string;
}

export function RiskDeltaDisplay({
  systemType,
  before,
  after,
  completedDate
}: RiskDeltaDisplayProps) {
  const scoreDelta = after.score - before.score;
  const isImprovement = scoreDelta > 0;
  
  const riskBefore = before.failureProbability12mo !== undefined ? (before.failureProbability12mo * 100) : null;
  const riskAfter = after.failureProbability12mo !== undefined ? (after.failureProbability12mo * 100) : null;
  const riskReduction = riskBefore !== null && riskAfter !== null ? (riskBefore - riskAfter) : null;
  
  const monthsBefore = before.monthsRemaining;
  const monthsAfter = after.monthsRemaining;
  const monthsAdded = monthsBefore !== undefined && monthsAfter !== undefined ? (monthsAfter - monthsBefore) : null;
  
  // Format system name
  const systemName = systemType
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  
  return (
    <Card className={`border ${isImprovement ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-muted bg-muted/30'}`}>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isImprovement ? (
              <TrendingDown className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            )}
            <span className={`font-semibold ${isImprovement ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
              {systemName} - Maintenance Impact
            </span>
          </div>
          {completedDate && (
            <Badge variant="outline" className="text-xs">
              {new Date(completedDate).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Health Score */}
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">Health Score</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{before.score}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className={`font-bold ${isImprovement ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>
                {after.score}
              </span>
              {scoreDelta !== 0 && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${scoreDelta > 0 ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'}`}
                >
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Failure Risk */}
          {riskBefore !== null && riskAfter !== null && (
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">12-Month Failure Risk</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{riskBefore.toFixed(1)}%</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className={`font-bold ${riskReduction && riskReduction > 0 ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>
                  {riskAfter.toFixed(1)}%
                </span>
                {riskReduction !== null && Math.abs(riskReduction) > 0.1 && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${riskReduction > 0 ? 'text-green-600 border-green-300' : 'text-yellow-600 border-yellow-300'}`}
                  >
                    {riskReduction > 0 ? '-' : '+'}{Math.abs(riskReduction).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Months Remaining */}
          {monthsBefore !== undefined && monthsAfter !== undefined && (
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Expected Lifespan</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{monthsBefore}mo</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className={`font-bold ${monthsAdded && monthsAdded > 0 ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>
                  {monthsAfter}mo
                </span>
                {monthsAdded !== null && monthsAdded !== 0 && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${monthsAdded > 0 ? 'text-green-600 border-green-300' : 'text-yellow-600 border-yellow-300'}`}
                  >
                    {monthsAdded > 0 ? '+' : ''}{monthsAdded}mo
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Success Message */}
        {isImprovement && (
          <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Maintenance successfully reduced system risk
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
