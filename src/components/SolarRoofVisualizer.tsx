import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sun, Camera, Zap, Info } from 'lucide-react';
import { SolarInsights } from '@/hooks/useSolarInsights';
import { GeoTiffCanvas } from '@/components/GeoTiffCanvas';

interface SolarRoofVisualizerProps {
  solarData: SolarInsights | null;
  loading?: boolean;
}

export const SolarRoofVisualizer: React.FC<SolarRoofVisualizerProps> = ({ solarData, loading }) => {
  const [selectedConfig, setSelectedConfig] = useState(0);

  if (loading || !solarData?.coverage || !solarData.imagery?.roofImageUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Roof Solar Visualization
            <Badge variant="secondary">Unavailable</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Roof imagery not available for this location.
          </p>
        </CardContent>
      </Card>
    );
  }

  const configs = solarData.systemOptions.slice(0, 5); // Show top 5 configurations
  const currentConfig = configs[selectedConfig] || configs[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Roof Solar Visualization
          <Badge variant="default">Live Imagery</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="roof" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="roof">Roof View</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="roof" className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border">
              <GeoTiffCanvas 
                url={solarData.imagery.roofImageUrl}
                alt="Roof satellite imagery"
                className="w-full h-64 object-cover"
                mode="rgb"
              />
              
              {solarData.imagery.solarFluxUrl && (
                <div className="absolute inset-0">
                  <GeoTiffCanvas 
                    url={solarData.imagery.solarFluxUrl}
                    alt="Solar flux overlay"
                    className="w-full h-full opacity-60 mix-blend-multiply"
                    mode="flux"
                  />
                </div>
              )}
              
              {/* Panel configuration overlay */}
              <div className="absolute bottom-4 left-4 bg-background/90 rounded-lg p-3">
                <div className="text-sm font-medium">
                  {currentConfig?.panelCount} Solar Panels
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(currentConfig?.annualGenerationKwh || 0).toLocaleString()} kWh/year
                </div>
              </div>
              
              <div className="absolute top-4 right-4 bg-background/90 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">
                  Imagery: {solarData.imagery.imageryDate ? 
                    new Date(solarData.imagery.imageryDate.year, solarData.imagery.imageryDate.month - 1, solarData.imagery.imageryDate.day).toLocaleDateString() : 
                    'Current'}
                </div>
              </div>
            </div>
            
            {/* Configuration selector */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Solar System Configurations:</div>
              <div className="flex gap-2 flex-wrap">
                {configs.map((config, index) => (
                  <Button
                    key={index}
                    variant={selectedConfig === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedConfig(index)}
                  >
                    {config.panelCount} panels
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Best Segments</span>
                </div>
                <div className="space-y-2">
                  {solarData.roofSegments
                    .sort((a, b) => b.sunshineScore - a.sunshineScore)
                    .slice(0, 3)
                    .map((segment, index) => (
                      <div key={index} className="text-xs p-2 bg-muted rounded">
                        <div className="font-medium">Segment {index + 1}</div>
                        <div className="text-muted-foreground">
                          {Math.round(segment.sunshineScore)}h sun • {Math.round(segment.area)}m²
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Optimal Placement</span>
                </div>
                <div className="space-y-2">
                  {solarData.roofSegments
                    .filter(segment => segment.pitch >= 15 && segment.pitch <= 45)
                    .slice(0, 3)
                    .map((segment, index) => (
                      <div key={index} className="text-xs p-2 bg-muted rounded">
                        <div className="font-medium">
                          {Math.round(segment.pitch)}° pitch, {Math.round(segment.azimuth)}° azimuth
                        </div>
                        <div className="text-muted-foreground">
                          {segment.azimuth >= 135 && segment.azimuth <= 225 ? 'South-facing ✓' : 'Alt orientation'}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Analysis Notes</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Optimal roof pitch: 15-45 degrees</li>
                <li>• Best orientation: South-facing (180° azimuth)</li>
                <li>• Heat map shows solar irradiance levels</li>
                <li>• Multiple configurations available for comparison</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};