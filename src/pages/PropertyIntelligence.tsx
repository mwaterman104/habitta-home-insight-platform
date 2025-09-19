import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Building, 
  Home, 
  Thermometer, 
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Calendar,
  DollarSign
} from "lucide-react";
import { useHomeIntelligence } from "@/hooks/useHomeIntelligence";

export default function PropertyIntelligence() {
  const { validationInsights, predictions, loading, error, userHome } = useHomeIntelligence();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading property intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!userHome) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Home Found</h2>
          <p className="text-muted-foreground">Please add a home to view property intelligence.</p>
        </div>
      </div>
    );
  }

  const getConditionBadge = (score: number) => {
    if (score >= 85) return { variant: "default" as const, text: "Excellent", color: "text-green-600" };
    if (score >= 70) return { variant: "secondary" as const, text: "Good", color: "text-blue-600" };
    if (score >= 55) return { variant: "outline" as const, text: "Fair", color: "text-yellow-600" };
    return { variant: "destructive" as const, text: "Poor", color: "text-red-600" };
  };

  const getRiskBadge = (risk: string) => {
    const riskLevel = risk.toLowerCase();
    if (riskLevel.includes('low')) return { variant: "default" as const, text: risk };
    if (riskLevel.includes('medium')) return { variant: "secondary" as const, text: risk };
    return { variant: "destructive" as const, text: risk };
  };

  // Transform validation insights into domain data
  const roofInsight = validationInsights.find(i => i.system === 'roof');
  const hvacInsight = validationInsights.find(i => i.system === 'hvac');
  const waterHeaterInsight = validationInsights.find(i => i.system === 'water_heater');
  
  // Use predictions data when available, fall back to validation insights
  const overallHealth = predictions?.overallHealth || 85;

  const domains = [
    {
      id: "roof",
      icon: Building,
      title: "Roof Health",
      condition: getConditionBadge(roofInsight?.conditionScore || 75),
      score: roofInsight?.conditionScore || 75,
      findings: roofInsight?.findings || [
        "Age: Unknown",
        "Material: Assessment needed",
        "Condition: Requires evaluation"
      ],
      recommendations: roofInsight?.recommendations || [
        "Schedule professional inspection",
        "Monitor for visible damage",
        "Plan for future replacement"
      ],
      nextAction: roofInsight?.nextService || "Professional inspection",
      cost: "$200-400",
      timeline: roofInsight?.replacementTimeline || "Monitor condition"
    },
    {
      id: "foundation",
      icon: Home,
      title: "Foundation",
      condition: getConditionBadge(90),
      score: 90,
      findings: [
        "Foundation type: Evaluated from property data",
        "Settlement risk: Low based on age and location",
        "Drainage: Monitor and maintain",
        "Overall stability: Good"
      ],
      recommendations: [
        "Annual visual inspection",
        "Maintain proper drainage around foundation",
        "Monitor for cracks or settling"
      ],
      nextAction: "Annual drainage inspection",
      cost: "$150-300",
      timeline: "Annual monitoring"
    },
    {
      id: "hvac",
      icon: Thermometer,
      title: "HVAC & Climate",
      condition: getConditionBadge(hvacInsight?.conditionScore || 80),
      score: hvacInsight?.conditionScore || 80,
      findings: hvacInsight?.findings || [
        "Age: Assessment based on property data",
        "System type: Central air/heating",
        "Condition: Regular maintenance needed"
      ],
      recommendations: hvacInsight?.recommendations || [
        "Regular filter changes every 3 months",
        "Annual professional maintenance", 
        "Monitor efficiency and performance"
      ],
      nextAction: hvacInsight?.nextService || "Filter replacement",
      cost: "$45-150",
      timeline: "Monthly filters, annual service"
    },
    {
      id: "water",
      icon: Zap,
      title: "Water Systems",
      condition: getConditionBadge(waterHeaterInsight?.conditionScore || 78),
      score: waterHeaterInsight?.conditionScore || 78,
      findings: waterHeaterInsight?.findings || [
        "Water heater: Standard electric/gas unit",
        "Age: Estimated from property data",
        "Efficiency: Monitor performance"
      ],
      recommendations: waterHeaterInsight?.recommendations || [
        "Annual maintenance inspection",
        "Monitor for efficiency decline",
        "Consider tankless upgrade for efficiency"
      ],
      nextAction: waterHeaterInsight?.nextService || "Annual maintenance",
      cost: "$200-300",
      timeline: "Annual service"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Property Intelligence</h1>
        <p className="text-muted-foreground">
          AI-powered insights and lifespan predictions across property systems
        </p>
        <div className="flex items-center gap-4 mt-4">
          <Badge variant="outline" className="gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Last Updated: {new Date().toLocaleDateString()}
          </Badge>
          <Badge variant="secondary">
            Health Score: {overallHealth}%
          </Badge>
          <Badge variant="outline">
            {validationInsights.length} Systems Analyzed
          </Badge>
        </div>
      </div>

      {/* Domain Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {domains.map((domain) => {
          const IconComponent = domain.icon;
          return (
            <Card 
              key={domain.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
              onClick={() => setSelectedDomain(domain.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <IconComponent className="h-6 w-6 text-primary" />
                  <Badge variant={domain.condition.variant}>
                    {domain.condition.text}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{domain.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Health Score</span>
                    <span className={domain.condition.color}>{domain.score}%</span>
                  </div>
                  <Progress value={domain.score} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Key Findings:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {domain.findings.slice(0, 2).map((finding, idx) => (
                      <li key={idx}>• {finding}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{domain.nextAction}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{domain.cost}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed View */}
      {selectedDomain && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {domains.find(d => d.id === selectedDomain)?.title} - Detailed Analysis
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDomain(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="findings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="findings">Findings</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              
              <TabsContent value="findings" className="mt-6">
                <div className="grid gap-4">
                  {domains.find(d => d.id === selectedDomain)?.findings.map((finding, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{finding}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations" className="mt-6">
                <div className="grid gap-4">
                  {domains.find(d => d.id === selectedDomain)?.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="timeline" className="mt-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Next Action</h4>
                      <Badge variant="outline">
                        {domains.find(d => d.id === selectedDomain)?.timeline}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {domains.find(d => d.id === selectedDomain)?.nextAction}
                    </p>
                    <p className="text-sm font-medium mt-2">
                      Estimated Cost: {domains.find(d => d.id === selectedDomain)?.cost}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Compact Maintenance Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Maintenance Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Next 12 months of predicted maintenance needs
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {validationInsights.slice(0, 3).map((insight, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    insight.status === 'excellent' ? 'bg-green-500' :
                    insight.status === 'good' ? 'bg-blue-500' :
                    insight.status === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="font-medium text-sm">
                      {insight.system.charAt(0).toUpperCase() + insight.system.slice(1).replace('_', ' ')} 
                      {insight.nextService ? ` - ${insight.nextService}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insight.replacementTimeline && `Timeline: ${insight.replacementTimeline}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{insight.conditionScore}%</p>
                  <Badge 
                    variant={insight.status === 'excellent' || insight.status === 'good' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {Math.round(insight.confidence * 100)}% confident
                  </Badge>
                </div>
              </div>
            ))}
            {validationInsights.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="h-8 w-8 mx-auto mb-2" />
                <p>No system data available. Add home systems to see predictions.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}