import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { DollarSign, TrendingUp, Calendar, Calculator } from 'lucide-react';
import { SolarInsights } from '@/hooks/useSolarInsights';

interface SolarSavingsEstimatorProps {
  solarData: SolarInsights | null;
  loading?: boolean;
}

export const SolarSavingsEstimator = ({ solarData, loading }: SolarSavingsEstimatorProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Solar Financial Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!solarData?.coverage || solarData.financialProjections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Solar Financial Analysis
            <Badge variant="secondary">Unavailable</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Financial analysis requires solar coverage data for your location.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Find the most cost-effective system (best payback period)
  const bestSystem = solarData.financialProjections.reduce((best, current) => {
    return current.paybackYears < best.paybackYears ? current : best;
  }, solarData.financialProjections[0]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: bestSystem.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const monthlyLoan = bestSystem.totalSavings20Years / 240; // Rough estimate for 20-year financing

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Solar Financial Analysis
          <Badge variant="default">Live Data</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Monthly Savings</span>
            </div>
            <div className="text-xl font-bold text-primary">
              {formatCurrency(bestSystem.monthlyBillOffset)}
            </div>
          </div>

          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Payback Period</span>
            </div>
            <div className="text-xl font-bold text-green-600">
              {Math.round(bestSystem.paybackYears)} years
            </div>
          </div>

          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">20-Year Savings</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(bestSystem.totalSavings20Years)}
            </div>
          </div>
        </div>

        {/* System Details */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Recommended System Details</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Panel Count</span>
              <span className="font-medium">{bestSystem.panelCount} panels</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Annual Generation</span>
              <span className="font-medium">
                {Math.round(bestSystem.annualGenerationKwh).toLocaleString()} kWh
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Lifetime Generation</span>
              <span className="font-medium">
                {Math.round(bestSystem.lifetimeGenerationKwh).toLocaleString()} kWh
              </span>
            </div>
          </div>
        </div>

        {/* Financing Estimate */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Estimated Financing</h4>
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Est. Monthly Payment</span>
              <span className="font-medium">{formatCurrency(monthlyLoan)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Your Monthly Savings</span>
              <span className="font-medium text-green-600">
                {formatCurrency(bestSystem.monthlyBillOffset)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>Net Monthly Impact</span>
              <span className={monthlyLoan < bestSystem.monthlyBillOffset ? "text-green-600" : "text-orange-600"}>
                {formatCurrency(bestSystem.monthlyBillOffset - monthlyLoan)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            *Estimate based on 20-year financing. Actual terms may vary.
          </p>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Financial projections from Google Solar API • Updated {new Date(solarData.lastUpdated).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};