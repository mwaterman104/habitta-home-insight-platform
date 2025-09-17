import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Building, Calendar, MapPin, Wrench, Home } from "lucide-react";
import { EnrichmentSnapshot } from "@/lib/validation-cockpit";

interface EnrichmentSummaryProps {
  snapshots: EnrichmentSnapshot[];
}

export function EnrichmentSummary({ snapshots }: EnrichmentSummaryProps) {
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'shovels': return <FileText className="h-4 w-4" />;
      case 'attom': return <Building className="h-4 w-4" />;
      case 'estated': return <Home className="h-4 w-4" />;
      case 'imagery': return <Calendar className="h-4 w-4" />;
      case 'smarty': return <MapPin className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const summarizeSnapshot = (snapshot: EnrichmentSnapshot) => {
    const insights: string[] = [];
    
    try {
      const data = snapshot.payload;
      
      if (snapshot.provider === 'shovels') {
        const permits = data.permits || [];
        if (permits.length > 0) {
          insights.push(`Found ${permits.length} permits`);
          
          // Count by system type
          const systemCounts: Record<string, number> = {};
          permits.forEach((permit: any) => {
            const systems = permit.system_tags || [];
            systems.forEach((system: string) => {
              systemCounts[system] = (systemCounts[system] || 0) + 1;
            });
          });
          
          Object.entries(systemCounts).forEach(([system, count]) => {
            if (count > 0) {
              insights.push(`${count} ${system} permit${count > 1 ? 's' : ''}`);
            }
          });

          // Latest permit
          const sortedPermits = permits.sort((a: any, b: any) => 
            new Date(b.date_issued || b.date_finaled).getTime() - new Date(a.date_issued || a.date_finaled).getTime()
          );
          if (sortedPermits[0]) {
            const latestYear = new Date(sortedPermits[0].date_issued || sortedPermits[0].date_finaled).getFullYear();
            insights.push(`Latest permit: ${latestYear}`);
          }
        } else {
          insights.push("No permits found");
        }
      }
      
      if (snapshot.provider === 'attom') {
        if (data.year_built) {
          const age = new Date().getFullYear() - data.year_built;
          insights.push(`Built ${data.year_built} (${age} years old)`);
        }
        if (data.square_footage) {
          insights.push(`${data.square_footage.toLocaleString()} sq ft`);
        }
        if (data.lot_size_sq_ft) {
          insights.push(`${(data.lot_size_sq_ft / 43560).toFixed(2)} acre lot`);
        }
        if (data.heating_type) {
          insights.push(`Heating: ${data.heating_type}`);
        }
        if (data.roof_material) {
          insights.push(`Roof: ${data.roof_material}`);
        }
      }
      
      if (snapshot.provider === 'estated') {
        if (data.property_condition_score) {
          insights.push(`Condition score: ${data.property_condition_score}/100`);
        }
        if (data.maintenance_recommendations) {
          insights.push(`${data.maintenance_recommendations.length} maintenance items`);
        }
        if (data.roof_analysis?.condition) {
          insights.push(`Roof: ${data.roof_analysis.condition}`);
        }
      }

      if (snapshot.provider === 'smarty') {
        if (data.financial?.assessed_value) {
          insights.push(`Assessed value: $${data.financial.assessed_value.toLocaleString()}`);
        }
        if (data.property?.bed_bath) {
          insights.push(`${data.property.bed_bath}`);
        }
      }

      if (snapshot.provider === 'imagery') {
        if (data.roof_analysis) {
          insights.push(`Roof imagery analyzed`);
        }
        if (data.condition_score) {
          insights.push(`Visual condition: ${data.condition_score}/10`);
        }
      }
      
    } catch (error) {
      insights.push("Data analysis incomplete");
    }

    return insights.slice(0, 4); // Limit to top 4 insights
  };

  if (snapshots.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            No enrichment data available for this property.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {snapshots.map((snapshot) => {
        const insights = summarizeSnapshot(snapshot);
        
        return (
          <Card key={snapshot.snapshot_id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getProviderIcon(snapshot.provider)}
                  <span className="capitalize">{snapshot.provider}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {new Date(snapshot.retrieved_at).toLocaleDateString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.length > 0 ? (
                insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm">{insight}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No key insights extracted</p>
              )}
              
              <details className="pt-2 cursor-pointer">
                <summary className="text-xs text-primary hover:underline">
                  View raw data
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(snapshot.payload, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}