import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { useSmartyFinancialData } from '@/hooks/useSmartyFinancialData';
import { useUserHome } from '@/hooks/useUserHome';

export function PropertyValueCard() {
  const { fullAddress } = useUserHome();
  const { data: financialData, loading, error } = useSmartyFinancialData();

  if (!fullAddress) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Property Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Add a home to see property value</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const getConfidenceBadgeVariant = (confidence?: string) => {
    if (!confidence) return 'secondary';
    const conf = confidence.toLowerCase();
    if (conf.includes('high')) return 'default';
    if (conf.includes('medium')) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Property Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-muted rounded w-24"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !financialData) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Property Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || 'No valuation data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const primaryValue = financialData.avm_value || financialData.market_value || financialData.assessed_value;
  const hasRange = financialData.value_range_low && financialData.value_range_high;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Property Value</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-2xl font-bold">{formatCurrency(primaryValue)}</div>
          {financialData.avm_confidence && (
            <Badge variant={getConfidenceBadgeVariant(financialData.avm_confidence)} className="mt-1">
              {financialData.avm_confidence} Confidence
            </Badge>
          )}
        </div>
        
        {hasRange && (
          <div className="text-sm text-muted-foreground">
            Range: {formatCurrency(financialData.value_range_low)} - {formatCurrency(financialData.value_range_high)}
          </div>
        )}

        {financialData.price_per_sqft && (
          <div className="flex items-center text-sm">
            <span className="font-medium">${financialData.price_per_sqft}/sqft</span>
          </div>
        )}

        {financialData.last_sale_price && (
          <div className="pt-2 border-t">
            <div className="text-sm text-muted-foreground">Last Sale</div>
            <div className="flex items-center justify-between">
              <span className="font-medium">{formatCurrency(financialData.last_sale_price)}</span>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(financialData.last_sale_date)}
              </div>
            </div>
          </div>
        )}

        {financialData.avm_date && (
          <div className="text-xs text-muted-foreground">
            Last updated: {formatDate(financialData.avm_date)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}