import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Sun, Zap, TreePine, Calculator } from 'lucide-react';
import { SolarInsights } from '@/hooks/useSolarInsights';

interface SolarPotentialCardProps {
  solarData: SolarInsights | null;
  loading?: boolean;
}

export const SolarPotentialCard = ({ solarData, loading }: SolarPotentialCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Solar Potential Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!solarData?.coverage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Solar Potential Analysis
            <Badge variant="secondary">Unavailable</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Solar analysis is not available for this location. This may be due to insufficient 
            satellite imagery or the property being outside Google's coverage area.
          </p>
        </CardContent>
      </Card>
    );
  }

  const bestSystem = solarData.systemOptions[Math.floor(solarData.systemOptions.length / 2)] || solarData.systemOptions[0];
  const bestFinancial = solarData.financialProjections.find(p => p.panelCount === bestSystem?.panelCount);
  
  const roofUtilization = solarData.roofAnalysis.totalRoofArea > 0 
    ? (bestSystem?.panelCount * 20) / solarData.roofAnalysis.totalRoofArea * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          Solar Potential Analysis
          <Badge variant="default">Live Data</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Roof Analysis */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Max Solar Panels</span>
            </div>
            <div className="text-2xl font-bold">{solarData.roofAnalysis.maxPanels}</div>
            <div className="text-xs text-muted-foreground">
              {Math.round(solarData.roofAnalysis.totalRoofArea)} m² roof area
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Sunshine Hours</span>
            </div>
            <div className="text-2xl font-bold">
              {Math.round(solarData.roofAnalysis.sunshineHoursPerYear).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">hours per year</div>
          </div>
        </div>

        {/* Recommended System */}
        {bestSystem && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Recommended System</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Roof Utilization</span>
                <span className="text-sm font-medium">{Math.round(roofUtilization)}%</span>
              </div>
              <Progress value={roofUtilization} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">{bestSystem.panelCount} Panels</div>
                  <div className="text-muted-foreground">Solar array size</div>
                </div>
                <div>
                  <div className="font-medium">
                    {Math.round(bestSystem.annualGenerationKwh).toLocaleString()} kWh
                  </div>
                  <div className="text-muted-foreground">Annual generation</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Environmental Impact */}
        {bestFinancial && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <TreePine className="h-4 w-4 text-green-600" />
              <span className="font-medium">Environmental Impact</span>
            </div>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>CO₂ Offset (20 years)</span>
                <span className="font-medium">
                  {Math.round((bestFinancial.annualGenerationKwh * 20 * solarData.roofAnalysis.carbonOffsetFactor) / 1000)} tons
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Equivalent to planting {Math.round((bestFinancial.annualGenerationKwh * 20 * solarData.roofAnalysis.carbonOffsetFactor) / 1000 * 16)} trees
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Data from Google Solar API • Updated {new Date(solarData.lastUpdated).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};