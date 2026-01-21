import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, AlertTriangle, Calculator, Clock, Target, ArrowUp, ArrowDown, Shield, Home, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { usePredictiveCosts } from '@/hooks/usePredictiveCosts';
import { useSmartRecommendations } from '@/hooks/useSmartRecommendations';
import { EquityImpactDashboard } from './EquityImpactDashboard';
import { PropertyValueCard } from './PropertyValueCard';
import { MortgageInsights } from './MortgageInsights';
import { useUserHome } from '@/hooks/useUserHome';
import { useIntelligenceBudget } from '@/hooks/useIntelligenceEngine';

interface FinancialData {
  homeValue: number;
  valueChange: number;
  maintenanceBudget: number;
  spentThisYear: number;
  projectedSpend1Year: number;
  projectedSpend3Year: number;
  preventativeSavings: number;
  roiFromProjects: number;
  insuranceDiscount: number;
}

interface FinancialInsightsProps {
  data?: FinancialData;
}

const defaultFinancialData: FinancialData = {
  homeValue: 0,
  valueChange: 0,
  maintenanceBudget: 5000,
  spentThisYear: 0,
  projectedSpend1Year: 0,
  projectedSpend3Year: 0,
  preventativeSavings: 0,
  roiFromProjects: 0,
  insuranceDiscount: 0
};

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({ 
  data = defaultFinancialData
}) => {
  const { userHome, fullAddress } = useUserHome();
  const propertyId = userHome?.id; // Use home's primary ID, not property_id foreign key
  
  // Use Intelligence Engine for budget predictions
  const { data: budgetData, loading, error } = useIntelligenceBudget(propertyId);
  
  // Use real data if available, fallback to mock data
  const budgetUsed = budgetData?.budgetUtilization || Math.round((data.spentThisYear / data.maintenanceBudget) * 100);
  const remainingBudget = data.maintenanceBudget - data.spentThisYear;

  return (
    <div className="space-y-6">
      {/* Mortgage Insights - Real mortgage data from Smarty API */}
      <MortgageInsights />
      
      {/* Equity Impact Dashboard */}
      <EquityImpactDashboard />
      
      {/* Traditional Financial Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Property Value from Smarty Financial API */}
      <PropertyValueCard />

      {/* Spend Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Spend Forecast
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {budgetData && (
              <Badge variant="outline" className="text-xs">
                AI-Powered
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning">Using backup budget data</p>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm md:text-base text-muted-foreground">This Quarter</span>
              <span className="font-semibold text-sm md:text-base">
                ${budgetData?.quarterlyForecast?.toLocaleString() || data.projectedSpend1Year.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm md:text-base text-muted-foreground">Next 12 Months</span>
              <span className="font-semibold text-sm md:text-base">
                ${budgetData?.yearlyForecast?.toLocaleString() || (data.projectedSpend1Year * 4).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm md:text-base text-muted-foreground">3-Year Outlook</span>
              <span className="font-semibold text-sm md:text-base">
                ${budgetData?.threeYearForecast?.toLocaleString() || data.projectedSpend3Year.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Budget Progress</span>
              <span className="text-sm font-medium">{budgetUsed}% used</span>
            </div>
            <Progress value={budgetUsed} className="h-2 md:h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>${data.spentThisYear.toLocaleString()} spent</span>
              <span>${remainingBudget.toLocaleString()} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Smart Budgeting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 md:p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <Shield className="h-4 w-4 text-accent" />
                <span className="text-sm md:text-base">Insurance Savings</span>
              </div>
              <span className="font-semibold text-accent text-sm md:text-base">-${data.insuranceDiscount}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 md:p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <ArrowDown className="h-4 w-4 text-accent" />
                <span className="text-sm md:text-base">Preventive vs Reactive</span>
              </div>
              <span className="font-semibold text-accent text-sm md:text-base">73% less</span>
            </div>
          </div>
          
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Completing preventive maintenance saves an average of 
                ${budgetData?.preventativeSavings?.toLocaleString() || data.preventativeSavings.toLocaleString()} annually vs reactive repairs.
              </p>
              {budgetData?.confidence && (
                <p className="text-xs text-muted-foreground mt-2">
                  AI Confidence: {Math.round(budgetData.confidence * 100)}%
                </p>
              )}
            </div>
        </CardContent>
      </Card>

      {/* Financing & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financing & Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">HVAC Upgrade Loan</span>
                <Badge variant="outline" className="text-xs">Pre-approved</Badge>
              </div>
              <p className="text-xs text-muted-foreground">0% APR for 18 months</p>
            </div>
            
            <div className="p-3 border border-accent/20 bg-accent/5 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Energy Rebates</span>
                <span className="text-sm font-semibold text-accent">$2,400</span>
              </div>
              <p className="text-xs text-muted-foreground">Available for solar + insulation</p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Get personalized financing options for major home improvements.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 text-xs bg-primary text-primary-foreground py-2 px-3 rounded-md hover:bg-primary/90">
                View Offers
              </button>
              <button className="flex-1 text-xs border border-border py-2 px-3 rounded-md hover:bg-muted">
                Calculate ROI
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};