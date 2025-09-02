import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { usePropertyIntelligence } from "../hooks/useHabittaLocal";
import { 
  Home, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Shield, 
  Zap, 
  Droplets, 
  TreePine,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";

const PropertyIntelligenceTab = () => {
  const propertyData = usePropertyIntelligence();

  if (!propertyData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Loading property intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Satellite View Mock */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-muted rounded-lg h-64 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Home className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Satellite View</p>
                  <p className="text-xs text-muted-foreground">Interactive overlays available</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm">Roof Condition</Button>
                <Button variant="outline" size="sm">Drainage Flow</Button>
                <Button variant="outline" size="sm">Vegetation</Button>
                <Button variant="outline" size="sm">Solar Exposure</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Property Stats Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Property Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Built:</span>
                <span className="text-sm font-medium">{propertyData.basicInfo.yearBuilt} ({propertyData.basicInfo.age} years old)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Lot Size:</span>
                <span className="text-sm font-medium">{propertyData.basicInfo.lotSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Structure:</span>
                <span className="text-sm font-medium">{propertyData.basicInfo.squareFootage} sq ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Update:</span>
                <span className="text-sm font-medium">{propertyData.basicInfo.lastMajorUpdate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Risk Score:</span>
                <Badge variant="secondary">{propertyData.basicInfo.riskScore}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Scrubber */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Property Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {propertyData.basicInfo.ownershipHistory.map((event: any, index: number) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{event.event}</p>
                    <span className="text-sm text-muted-foreground">{event.year}</span>
                  </div>
                  {event.price && (
                    <p className="text-sm text-muted-foreground">${event.price.toLocaleString()}</p>
                  )}
                  {event.value && (
                    <p className="text-sm text-muted-foreground">${event.value.toLocaleString()} investment</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <Tabs defaultValue="structural" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="structural">Structural</TabsTrigger>
          <TabsTrigger value="environmental">Environmental</TabsTrigger>
          <TabsTrigger value="neighborhood">Neighborhood</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
        </TabsList>

        <TabsContent value="structural" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Roof Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Roof Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Material:</span>
                    <span className="text-sm font-medium">{propertyData.structuralAnalysis.roofCondition.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Age:</span>
                    <span className="text-sm font-medium">{propertyData.structuralAnalysis.roofCondition.estimatedAge} years</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Condition Score:</span>
                    <Badge variant={propertyData.structuralAnalysis.roofCondition.conditionScore > 75 ? "default" : "secondary"}>
                      {propertyData.structuralAnalysis.roofCondition.conditionScore}/100
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Replacement:</span>
                    <span className="text-sm font-medium">{propertyData.structuralAnalysis.roofCondition.replacementTimeline}</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{propertyData.structuralAnalysis.roofCondition.neighborhoodStatus}</p>
                </div>
              </CardContent>
            </Card>

            {/* Foundation Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Foundation Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <span className="text-sm font-medium">{propertyData.structuralAnalysis.foundationHealth.type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Settlement Risk:</span>
                    <Badge variant="secondary">{propertyData.structuralAnalysis.foundationHealth.settlementRisk}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Drainage Grade:</span>
                    <Badge variant="default">{propertyData.structuralAnalysis.foundationHealth.drainageGrade}</Badge>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{propertyData.structuralAnalysis.foundationHealth.foundationMovementPrediction}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="environmental" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Climate Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Climate Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Sun Exposure</p>
                    <p className="text-xs text-muted-foreground">{propertyData.environmentalFactors.climateImpact.sunExposure}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Wind Protection</p>
                    <p className="text-xs text-muted-foreground">{propertyData.environmentalFactors.climateImpact.windExposure}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Weather Risk</p>
                    <p className="text-xs text-muted-foreground">{propertyData.environmentalFactors.climateImpact.weatherDamageCorrelation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Landscape Intelligence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="w-5 h-5" />
                  Landscape Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Tree Health</p>
                    <p className="text-xs text-muted-foreground">{propertyData.environmentalFactors.landscapeIntelligence.treeHealth}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Root System Risk</p>
                    <p className="text-xs text-muted-foreground">{propertyData.environmentalFactors.landscapeIntelligence.rootSystemRisk}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Seasonal Needs</p>
                    <p className="text-xs text-muted-foreground">{propertyData.environmentalFactors.landscapeIntelligence.seasonalMaintenanceNeeds}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="neighborhood" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Maintenance Benchmarking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Maintenance Benchmarking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Compliance Rate</p>
                    <p className="text-xs text-muted-foreground">{propertyData.neighborhoodContext.maintenanceBenchmarking.comparableHomeCycles}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Contractor Availability</p>
                    <p className="text-xs text-muted-foreground">{propertyData.neighborhoodContext.maintenanceBenchmarking.contractorAvailability}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Natural Disaster</span>
                    <Badge variant="secondary">Low</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Crime & Safety</span>
                    <Badge variant="secondary">Very Low</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Insurance Claims</span>
                    <Badge variant="secondary">Below Average</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Maintenance Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {propertyData.predictiveModeling.maintenanceForecasting.next12Months.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.item}</p>
                        <p className="text-sm text-muted-foreground">{item.month}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${item.cost}</p>
                        <Badge variant="outline" className="text-xs">{item.probability}% likely</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Financial Projections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Impact Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="font-medium text-green-700 dark:text-green-300">Proactive Path</p>
                    <p className="text-sm text-green-600 dark:text-green-400">2030 Value: ${propertyData.predictiveModeling.financialProjections.proactiveScenario.year2030Value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Net Position: ${propertyData.predictiveModeling.financialProjections.proactiveScenario.netPosition.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <p className="font-medium text-red-700 dark:text-red-300">Reactive Path</p>
                    <p className="text-sm text-red-600 dark:text-red-400">2030 Value: ${propertyData.predictiveModeling.financialProjections.reactiveScenario.year2030Value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Net Position: ${propertyData.predictiveModeling.financialProjections.reactiveScenario.netPosition.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">Potential Equity Impact</p>
                  <p className="text-xs text-muted-foreground">Proactive maintenance preserves ${propertyData.predictiveModeling.financialProjections.proactiveScenario.equityPreserved.toLocaleString()} more equity</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PropertyIntelligenceTab;