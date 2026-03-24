import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PropertyHistory } from '@/lib/propertyAPI';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  BarChart3,
  Home
} from 'lucide-react';

interface PropertyValueTrendsProps {
  propertyData: PropertyHistory;
}

const PropertyValueTrends: React.FC<PropertyValueTrendsProps> = ({
  propertyData
}) => {
  const calculateValueMetrics = () => {
    const sales = [...propertyData.saleHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    if (sales.length < 2) {
      return {
        currentValue: sales[0]?.price || 0,
        valueChange: 0,
        percentChange: 0,
        annualizedReturn: 0,
        totalAppreciation: 0
      };
    }
    
    const firstSale = sales[0];
    const lastSale = sales[sales.length - 1];
    
    const valueChange = lastSale.price - firstSale.price;
    const percentChange = (valueChange / firstSale.price) * 100;
    
    const firstDate = new Date(firstSale.date);
    const lastDate = new Date(lastSale.date);
    const yearsElapsed = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    const annualizedReturn = yearsElapsed > 0 ? 
      (Math.pow(lastSale.price / firstSale.price, 1 / yearsElapsed) - 1) * 100 : 0;
    
    return {
      currentValue: lastSale.price,
      valueChange,
      percentChange,
      annualizedReturn,
      totalAppreciation: valueChange
    };
  };

  const calculatePricePerSqft = () => {
    const latestSale = propertyData.saleHistory[propertyData.saleHistory.length - 1];
    if (!latestSale) return 0;
    
    return Math.round(latestSale.price / propertyData.propertyDetails.sqft);
  };

  const getMarketPosition = () => {
    const pricePerSqft = calculatePricePerSqft();
    
    // These would be based on local market data in a real app
    const marketAverage = 180; // Example market average per sqft
    const premiumThreshold = marketAverage * 1.2;
    const valueThreshold = marketAverage * 0.8;
    
    if (pricePerSqft >= premiumThreshold) {
      return { position: 'Premium', color: 'default', description: 'Above market average' };
    } else if (pricePerSqft <= valueThreshold) {
      return { position: 'Value', color: 'secondary', description: 'Below market average' };
    } else {
      return { position: 'Market Rate', color: 'outline', description: 'Near market average' };
    }
  };

  const getValueDrivers = () => {
    const drivers = [];
    const age = new Date().getFullYear() - propertyData.propertyDetails.yearBuilt;
    
    // Property characteristics that drive value
    if (propertyData.propertyDetails.sqft > 2500) {
      drivers.push({ factor: 'Large Square Footage', impact: 'Positive' });
    }
    
    if (propertyData.propertyDetails.bedrooms >= 4) {
      drivers.push({ factor: 'Multiple Bedrooms', impact: 'Positive' });
    }
    
    if (propertyData.propertyDetails.bathrooms >= 3) {
      drivers.push({ factor: 'Multiple Bathrooms', impact: 'Positive' });
    }
    
    if (age < 10) {
      drivers.push({ factor: 'New Construction', impact: 'Positive' });
    } else if (age > 50) {
      drivers.push({ factor: 'Historic Property Age', impact: 'Mixed' });
    }
    
    // Recent sales activity
    const recentSales = propertyData.saleHistory.filter(sale => 
      new Date(sale.date).getFullYear() >= new Date().getFullYear() - 5
    );
    
    if (recentSales.length > 1) {
      drivers.push({ factor: 'Recent Sales Activity', impact: 'Positive' });
    }
    
    return drivers;
  };

  const metrics = calculateValueMetrics();
  const pricePerSqft = calculatePricePerSqft();
  const marketPosition = getMarketPosition();
  const valueDrivers = getValueDrivers();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Property Value Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Value */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-primary">
              ${metrics.currentValue.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Current Estimated Value</p>
          </div>
          <Badge variant={marketPosition.color as any}>
            {marketPosition.position}
          </Badge>
        </div>
        
        {/* Price per Sqft */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-primary" />
            <span className="font-medium">Price per Square Foot</span>
          </div>
          <p className="text-2xl font-bold">${pricePerSqft}</p>
          <p className="text-sm text-muted-foreground">
            {marketPosition.description}
          </p>
        </div>
        
        {/* Value Change */}
        {metrics.percentChange !== 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                {metrics.percentChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span className={`font-semibold ${
                  metrics.percentChange > 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {metrics.percentChange > 0 ? '+' : ''}{metrics.percentChange.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Total Change</p>
            </div>
            
            <div className="text-center">
              <span className={`font-semibold ${
                metrics.annualizedReturn > 3 ? 'text-success' : 
                metrics.annualizedReturn > 0 ? 'text-warning' : 'text-destructive'
              }`}>
                {metrics.annualizedReturn > 0 ? '+' : ''}{metrics.annualizedReturn.toFixed(1)}%
              </span>
              <p className="text-sm text-muted-foreground">Annual Return</p>
            </div>
          </div>
        )}
        
        {/* Sale History Summary */}
        <div>
          <h4 className="font-medium mb-2">Recent Sales</h4>
          <div className="space-y-2">
            {propertyData.saleHistory.slice(-3).reverse().map((sale, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span>{new Date(sale.date).getFullYear()}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">${sale.price.toLocaleString()}</span>
                  <Badge variant="outline">{sale.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Value Drivers */}
        {valueDrivers.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2">Value Factors</h4>
            <div className="space-y-1">
              {valueDrivers.slice(0, 4).map((driver, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{driver.factor}</span>
                  <Badge 
                    variant={driver.impact === 'Positive' ? 'default' : 'secondary'}
                  >
                    {driver.impact}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Investment Insight */}
        {metrics.percentChange !== 0 && (
          <div className="bg-primary/5 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Investment Performance</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {metrics.annualizedReturn > 5 
                ? "Strong appreciation above market average"
                : metrics.annualizedReturn > 2
                ? "Steady appreciation in line with market"
                : "Below average appreciation - consider improvements"
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyValueTrends;