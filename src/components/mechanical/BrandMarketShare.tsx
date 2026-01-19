import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Database, Shield } from 'lucide-react';
import { type PermitRecord, calculateBrandMarketShare } from '@/lib/mechanicalIntelligence';

interface BrandMarketShareProps {
  records: PermitRecord[];
  className?: string;
}

// Brand-specific colors for consistent visualization
const BRAND_COLORS: Record<string, string> = {
  'Carrier': '#0066CC',
  'Trane': '#CC0000',
  'Lennox': '#FF6600',
  'Rheem': '#009933',
  'York': '#9933CC',
  'Goodman': '#FFB300',
  'Bryant': '#00B8D4',
  'American Standard': '#E91E63',
  'Ruud': '#4CAF50',
  'Daikin': '#3F51B5',
  'Mitsubishi': '#F44336',
  'Unknown': '#9E9E9E',
};

function getBrandColor(brand: string): string {
  return BRAND_COLORS[brand] || `hsl(${Math.abs(brand.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 70%, 50%)`;
}

export function BrandMarketShare({ records, className }: BrandMarketShareProps) {
  const marketShare = useMemo(() => calculateBrandMarketShare(records), [records]);
  
  const chartData = useMemo(() => {
    return Object.entries(marketShare.brandCounts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / marketShare.totalRecords) * 100),
        color: getBrandColor(name),
      }))
      .sort((a, b) => b.value - a.value);
  }, [marketShare]);
  
  const topBrands = chartData.slice(0, 3).filter(b => b.name !== 'Unknown');
  
  if (records.length === 0) {
    return null;
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Brand Market Share
          </CardTitle>
          <Badge 
            variant={marketShare.dataMoatStrength >= 50 ? 'default' : 'secondary'}
            className="gap-1"
          >
            <Database className="h-3 w-3" />
            {marketShare.dataMoatStrength}% Data Moat
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Distribution of {marketShare.totalRecords.toLocaleString()} HVAC systems by manufacturer
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percentage }) => 
                    percentage >= 5 ? `${name} (${percentage}%)` : ''
                  }
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} permits (${Math.round((value / marketShare.totalRecords) * 100)}%)`,
                    name
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Key Insights */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Investor Insights
              </h4>
              
              <div className="space-y-3">
                {/* Data Moat Strength */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Data Moat Strength</span>
                    <span className="text-sm font-bold">{marketShare.dataMoatStrength}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${marketShare.dataMoatStrength}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {marketShare.totalWithBrand.toLocaleString()} of {marketShare.totalRecords.toLocaleString()} systems have identifiable brands
                  </p>
                </div>
                
                {/* Top Brands */}
                {topBrands.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground block mb-2">Top Manufacturers</span>
                    <div className="space-y-2">
                      {topBrands.map((brand, i) => (
                        <div key={brand.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">{i + 1}.</span>
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: brand.color }}
                            />
                            <span className="text-sm font-medium">{brand.name}</span>
                          </div>
                          <span className="text-sm">
                            {brand.percentage}% ({brand.value.toLocaleString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Value Proposition */}
                <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                  <p className="text-xs text-primary font-medium">
                    💰 This brand market share data could be worth millions to manufacturers 
                    like Carrier or Lennox for competitive intelligence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
