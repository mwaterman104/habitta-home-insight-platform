import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  Home, 
  DollarSign, 
  Calculator, 
  ArrowUp, 
  PiggyBank,
  Hammer,
  Target
} from 'lucide-react';
import { useSmartyPropertyData, calculateRepairImpact } from '@/hooks/useSmartyPropertyData';
import { usePredictiveCosts } from '@/hooks/usePredictiveCosts';

interface EquityImpactDashboardProps {
  homeAddress?: string;
  homeId?: string;
}

export const EquityImpactDashboard: React.FC<EquityImpactDashboardProps> = ({ 
  homeAddress, 
  homeId 
}) => {
  // Short-circuit if no address
  if (!homeAddress) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Add a home to see equity insights</p>
      </div>
    );
  }

  const { data: propertyData, loading: propertyLoading, error: propertyError } = useSmartyPropertyData(homeAddress);
  const { data: costData } = usePredictiveCosts(homeId || '');
  
  const [repairCost, setRepairCost] = useState<number>(5000);
  const [expectedValueIncrease, setExpectedValueIncrease] = useState<number>(8000);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const equityData = propertyData ? calculateRepairImpact(propertyData, repairCost, expectedValueIncrease) : null;

  // Suggest high-impact repairs from predictive costs
  const highImpactRepairs = costData?.highPriorityItems?.slice(0, 3).map(item => ({
    name: item.system,
    cost: item.cost,
    valueIncrease: item.cost * 1.3, // 30% return assumption
    roi: 30
  })) || [];

  if (propertyLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Equity Overview */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Current Property Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">
                {propertyData 
                  ? formatCurrency(propertyData.currentValue) 
                  : (propertyError ? 'No data' : 'Loading...')}
              </p>
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-accent" />
                <span className="text-sm text-muted-foreground">
                  +{propertyData?.marketAppreciation || 4}% annually
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {propertyError ? 'Unable to fetch market data' : (
                  <>Last sold: {propertyData ? formatCurrency(propertyData.lastSalePrice) : 'N/A'}</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Current Equity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-accent">
                {equityData ? formatCurrency(equityData.currentEquity) : 'Calculating...'}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {equityData ? formatPercent(equityData.equityPercent) : '0%'} equity
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Est. mortgage: {equityData ? formatCurrency(equityData.estimatedMortgageBalance) : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Potential with Repairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-primary">
                {equityData ? formatCurrency(equityData.potentialValueWithRepairs) : 'Set repairs'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  +{equityData ? formatCurrency(equityData.potentialEquityIncrease) : '$0'} equity
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                ROI: {equityData ? formatPercent(equityData.repairROI) : '0%'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repair Impact Calculator */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Repair Impact Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repair-cost">Repair Investment</Label>
              <Input
                id="repair-cost"
                type="number"
                value={repairCost}
                onChange={(e) => setRepairCost(Number(e.target.value) || 0)}
                placeholder="Enter repair cost"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="value-increase">Expected Value Increase</Label>
              <Input
                id="value-increase"
                type="number"
                value={expectedValueIncrease}
                onChange={(e) => setExpectedValueIncrease(Number(e.target.value) || 0)}
                placeholder="Enter expected value increase"
              />
            </div>

            {equityData && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">New Home Value</span>
                  <span className="font-semibold">
                    {formatCurrency(equityData.potentialValueWithRepairs)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Equity Increase</span>
                  <span className="font-semibold text-accent">
                    +{formatCurrency(equityData.potentialEquityIncrease)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Return on Investment</span>
                  <Badge variant={equityData.repairROI > 100 ? "default" : "secondary"}>
                    {formatPercent(equityData.repairROI)}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* High-Impact Repair Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              High-Impact Repairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highImpactRepairs.length > 0 ? (
                highImpactRepairs.map((repair, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Hammer className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{repair.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatPercent(repair.roi)} ROI
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Cost: {formatCurrency(repair.cost)}</span>
                      <span>Value: +{formatCurrency(repair.valueIncrease)}</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2 text-xs"
                      onClick={() => {
                        setRepairCost(repair.cost);
                        setExpectedValueIncrease(repair.valueIncrease);
                      }}
                    >
                      Calculate Impact
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Hammer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No repair suggestions available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financing Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Equity-Based Financing Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Home Equity Line of Credit</span>
                <Badge variant="outline">Available</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Access up to {equityData ? formatCurrency(equityData.currentEquity * 0.8) : 'N/A'} 
                (80% of current equity)
              </p>
              <p className="text-xs font-medium text-primary">Variable rate starting at 7.5% APR</p>
            </div>
            
            <div className="p-4 border border-accent/20 bg-accent/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Cash-Out Refinance</span>
                <Badge variant="outline">Pre-qualified</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Access cash while potentially lowering your rate
              </p>
              <p className="text-xs font-medium text-accent">Fixed rate starting at 6.8% APR</p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button variant="default" size="sm">
              Get Pre-approved
            </Button>
            <Button variant="outline" size="sm">
              Compare Options
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};