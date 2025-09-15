import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSmartyFinancialData } from '@/hooks/useSmartyFinancialData';
import { Building2, Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';

export function MortgageInsights() {
  const { data: financialData, loading, error } = useSmartyFinancialData();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Mortgage Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !financialData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Mortgage Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Mortgage data not available</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const hasMortgageData = financialData.loan_amount || financialData.mortgage_amount_2;
  const currentValue = financialData.avm_value || financialData.market_value || 0;
  const totalMortgageBalance = financialData.total_estimated_mortgage_balance || 0;
  const currentEquity = currentValue - totalMortgageBalance;
  const equityPercentage = currentValue > 0 ? (currentEquity / currentValue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Equity Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Current Equity Position
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Home Value</p>
              <p className="text-lg font-semibold">{formatCurrency(currentValue)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Est. Mortgage Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(totalMortgageBalance)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Equity</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(currentEquity)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Equity %</p>
              <p className="text-lg font-semibold">{equityPercentage.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mortgage Details */}
      {hasMortgageData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Mortgage Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Mortgage */}
            {financialData.loan_amount && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Primary Mortgage</h4>
                  <Badge variant="outline">
                    {financialData.mortgage_type || 'Standard'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Amount</p>
                    <p className="font-medium">{formatCurrency(financialData.loan_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Est. Current Balance</p>
                    <p className="font-medium">{formatCurrency(financialData.estimated_current_balance)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">{financialData.interest_rate ? `${financialData.interest_rate}%` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Term</p>
                    <p className="font-medium">{financialData.mortgage_term ? `${financialData.mortgage_term} years` : 'N/A'}</p>
                  </div>
                </div>
                {financialData.lender_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lender</p>
                    <p className="font-medium">{financialData.lender_name}</p>
                  </div>
                )}
              </div>
            )}

            {/* Secondary Mortgage */}
            {financialData.mortgage_amount_2 && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Secondary Mortgage</h4>
                  <Badge variant="outline">
                    {financialData.mortgage_type_2 || 'Standard'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Amount</p>
                    <p className="font-medium">{formatCurrency(financialData.mortgage_amount_2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Est. Current Balance</p>
                    <p className="font-medium">{formatCurrency(financialData.estimated_current_balance_2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">{financialData.interest_rate_2 ? `${financialData.interest_rate_2}%` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Term</p>
                    <p className="font-medium">{financialData.mortgage_term_2 ? `${financialData.mortgage_term_2} years` : 'N/A'}</p>
                  </div>
                </div>
                {financialData.lender_name_2 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lender</p>
                    <p className="font-medium">{financialData.lender_name_2}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Equity-Based Planning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Equity-Based Planning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Available for HELOC</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(Math.max(0, currentEquity * 0.8 - totalMortgageBalance))}
              </p>
              <p className="text-xs text-muted-foreground">Up to 80% LTV</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Cash-Out Refi Potential</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(Math.max(0, currentValue * 0.8 - totalMortgageBalance))}
              </p>
              <p className="text-xs text-muted-foreground">80% LTV limit</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Recommended Buffer</p>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(currentEquity * 0.2)}
              </p>
              <p className="text-xs text-muted-foreground">20% equity cushion</p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Planning Insights</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your current equity gives you flexibility for major improvements</li>
              <li>• Consider HELOC for ongoing projects with variable costs</li>
              <li>• Cash-out refinancing may offer better rates for large renovations</li>
              <li>• Maintain 20% equity cushion for market protection</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}