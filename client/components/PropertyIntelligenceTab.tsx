import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Slider } from "../ui/slider";
import { usePropertyIntelligence } from "../hooks/useHabittaLocal";
import { 
  BarChart3, 
  Brain, 
  Database, 
  TrendingUp, 
  Shield, 
  Target,
  Activity,
  CheckCircle2,
  AlertCircle,
  Zap,
  Settings,
  LineChart,
  MapPin,
  Calendar,
  Home,
  Clock,
  DollarSign,
  Users,
  Cpu,
  FileText,
  Download,
  Gauge
} from "lucide-react";

const PropertyIntelligenceTab = () => {
  const propertyData = usePropertyIntelligence();
  const [selectedScenario, setSelectedScenario] = useState("current");

  if (!propertyData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Loading property intelligence...</p>
        </div>
      </div>
    );
  }

  const analytics = propertyData.analyticsEngine;

  return (
    <div className="space-y-6">
      {/* Hero Section: Model Performance Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Habitta Model Performance */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-primary" />
                Habitta Model Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{analytics.modelPerformance.overallAccuracy.last12Months}%</div>
                  <div className="text-sm text-muted-foreground">Overall Accuracy</div>
                  <div className="text-xs text-green-600 dark:text-green-400">↗ {analytics.modelPerformance.overallAccuracy.trend}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{analytics.modelPerformance.predictionAccuracy.maintenanceTiming}%</div>
                  <div className="text-sm text-muted-foreground">Maintenance Timing</div>
                  <div className="text-xs text-muted-foreground">last 12 months</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">±{analytics.modelPerformance.predictionAccuracy.costEstimates}%</div>
                  <div className="text-sm text-muted-foreground">Cost Variance</div>
                  <div className="text-xs text-muted-foreground">average estimate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{analytics.modelPerformance.calibrationMetrics.reliabilityScore * 100}%</div>
                  <div className="text-sm text-muted-foreground">Reliability Score</div>
                  <div className="text-xs text-muted-foreground">validated model</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confidence Intervals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Confidence Intervals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {propertyData.predictiveModeling.maintenanceForecasting.majorSystemReplacements.map((system: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{system.system} Replacement</span>
                  <Badge variant="outline">{system.confidence}% confidence</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {system.predictedReplacement} • {system.costProjection}
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div 
                    className="h-2 bg-primary rounded-full" 
                    style={{ width: `${system.confidence}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Quadrants */}
      <Tabs defaultValue="data-sources" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="data-sources" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data & Methodology
          </TabsTrigger>
          <TabsTrigger value="prediction-engine" className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Prediction Engine
          </TabsTrigger>
          <TabsTrigger value="market-intelligence" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Market Intelligence
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Model Validation
          </TabsTrigger>
        </TabsList>

        {/* Data Sources & Methodology */}
        <TabsContent value="data-sources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Input Data Streams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analytics.dataSources).map(([key, source]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {source.points && `${source.points} data points`}
                        {source.historicalYears && `${source.historicalYears} years historical`}
                        {source.comparableProperties && `${source.comparableProperties.toLocaleString()} properties`}
                        {source.devices && `${source.devices} IoT devices`}
                        {source.records && `${source.records} permit records`}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={source.reliability > 0.9 ? "default" : "secondary"}>
                        {Math.round(source.reliability * 100)}% reliable
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {source.coverage || source.connectivity || source.completeness || source.dataQuality}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Algorithm Transparency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Home Score Weighting</h4>
                  <div className="space-y-2">
                    {Object.entries(analytics.modelDetails.homeScoreWeighting).map(([system, weight]: [string, any]) => (
                      <div key={system} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{system.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full">
                            <div 
                              className="h-2 bg-primary rounded-full" 
                              style={{ width: `${weight * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground">{Math.round(weight * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Prediction Methods</h4>
                  <div className="space-y-1">
                    {Object.entries(analytics.modelDetails.predictionMethods).map(([method, description]: [string, any]) => (
                      <div key={method} className="text-sm">
                        <span className="font-medium capitalize">{method.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                        <span className="text-muted-foreground ml-1">{description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prediction Engine Internals */}
        <TabsContent value="prediction-engine" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Risk Scoring Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Object.entries(analytics.modelDetails.homeScoreWeighting).map(([system, weight]: [string, any]) => (
                    <div key={system} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">{system.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                        <span className="text-sm text-muted-foreground">{Math.round(weight * 100)}% weight</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full">
                          <div 
                            className="h-2 bg-gradient-to-r from-green-500 to-primary rounded-full" 
                            style={{ width: `${70 + Math.random() * 30}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(70 + Math.random() * 30)}/100
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5" />
                  Scenario Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {analytics.scenarioBuilder.availableVariables.slice(0, 2).map((variable: any, index: number) => (
                    <div key={variable.name} className="space-y-2">
                      <label className="text-sm font-medium">{variable.label}</label>
                      {variable.type === "slider" ? (
                        <div className="space-y-2">
                          <Slider
                            defaultValue={[variable.default]}
                            min={variable.range[0]}
                            max={variable.range[1]}
                            step={0.1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{variable.range[0]}x</span>
                            <span>{variable.default}x (current)</span>
                            <span>{variable.range[1]}x</span>
                          </div>
                        </div>
                      ) : (
                        <select className="w-full p-2 border rounded-md">
                          {variable.options.map((option: string) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Preset Scenarios</h4>
                  <div className="space-y-2">
                    {analytics.scenarioBuilder.presetScenarios.map((scenario: any, index: number) => (
                      <Button 
                        key={scenario.name}
                        variant={selectedScenario === scenario.name ? "default" : "outline"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setSelectedScenario(scenario.name)}
                      >
                        {scenario.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Market Intelligence */}
        <TabsContent value="market-intelligence" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Benchmarking Methodology
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{analytics.dataSources.benchmarkData.comparableProperties.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Comparable Properties</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{analytics.dataSources.benchmarkData.radius}</div>
                    <div className="text-sm text-muted-foreground">Analysis Radius</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Data Quality Score:</span>
                    <Badge variant="default">{Math.round(analytics.dataSources.benchmarkData.dataQuality * 100)}/100</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Last Refresh:</span>
                    <span className="text-sm text-muted-foreground">{analytics.dataSources.benchmarkData.lastRefresh}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Sample Significance:</span>
                    <Badge variant="secondary">95% confidence</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Predictive Modeling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Regional Factors</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Climate Impact Multiplier:</span>
                      <span className="font-medium">1.2x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Inflation Rate:</span>
                      <span className="font-medium">3.1% annually</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contractor Availability:</span>
                      <span className="font-medium">High</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Economic Integration</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• Regional labor cost adjustments</p>
                    <p>• Material price trend analysis</p>
                    <p>• Insurance risk correlation</p>
                    <p>• Property value trend modeling</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Model Validation */}
        <TabsContent value="validation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Historical Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Maintenance Timing</h4>
                  <div className="space-y-2">
                    {analytics.validation.historicalAccuracy.maintenanceTimingTrend.map((data: any) => (
                      <div key={data.year} className="flex items-center justify-between">
                        <span className="text-sm">{data.year}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full" 
                              style={{ width: `${data.accuracy}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{data.accuracy}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Cost Precision</h4>
                  <div className="space-y-2">
                    {analytics.validation.historicalAccuracy.costEstimatePrecision.map((data: any) => (
                      <div key={data.year} className="flex items-center justify-between">
                        <span className="text-sm">{data.year}</span>
                        <Badge variant={data.variance < 15 ? "default" : "secondary"}>
                          ±{data.variance}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Stress Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Severe Weather Events</p>
                    <p className="text-xs text-muted-foreground">{analytics.validation.stressTesting.severeWeatherEvents}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Market Volatility</p>
                    <p className="text-xs text-muted-foreground">{analytics.validation.stressTesting.marketVolatility}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Edge Cases</p>
                    <p className="text-xs text-muted-foreground">{analytics.validation.stressTesting.edgeCases}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Peer Validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Third-Party Validation</p>
                    <p className="text-xs text-muted-foreground">{analytics.validation.peerValidation.thirdPartyValidation}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Industry Benchmarks</p>
                    <p className="text-xs text-muted-foreground">{analytics.validation.peerValidation.industryBenchmarks}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Certifications</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analytics.validation.peerValidation.certifications.map((cert: string) => (
                        <Badge key={cert} variant="outline" className="text-xs">{cert}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Legacy Property Overview (Condensed) */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Property Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Built:</span>
              <span className="ml-2 font-medium">{propertyData.basicInfo.yearBuilt}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Size:</span>
              <span className="ml-2 font-medium">{propertyData.basicInfo.squareFootage} sq ft</span>
            </div>
            <div>
              <span className="text-muted-foreground">Lot:</span>
              <span className="ml-2 font-medium">{propertyData.basicInfo.lotSize}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Risk:</span>
              <Badge variant="secondary" className="ml-2">{propertyData.basicInfo.riskScore}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyIntelligenceTab;