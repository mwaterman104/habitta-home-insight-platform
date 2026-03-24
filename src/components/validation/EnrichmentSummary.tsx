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
        // Handle different Shovels response formats (success, error, no data)
        if (data.error || data.status === 'error') {
          insights.push("Error retrieving permits");
          if (data.message) {
            insights.push(data.message);
          }
        } else if (data.status === 'no_data') {
          insights.push("No permits found");
          if (data.message) {
            insights.push(data.message);
          }
        } else {
          const permits = data.permits || [];
          const violations = data.violations || [];
          
          if (permits.length > 0) {
            insights.push(`Found ${permits.length} permit${permits.length > 1 ? 's' : ''}`);
            
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
              new Date(b.date_issued || b.date_finaled || 0).getTime() - 
              new Date(a.date_issued || a.date_finaled || 0).getTime()
            );
            if (sortedPermits[0] && (sortedPermits[0].date_issued || sortedPermits[0].date_finaled)) {
              const latestYear = new Date(sortedPermits[0].date_issued || sortedPermits[0].date_finaled).getFullYear();
              insights.push(`Latest permit: ${latestYear}`);
            }
          } else if (violations.length > 0) {
            insights.push(`Found ${violations.length} violation${violations.length > 1 ? 's' : ''}`);
          } else {
            insights.push("No permits or violations found");
          }
        }
      }
      
      if (snapshot.provider === 'attom') {
        // Handle the actual ATTOM data structure
        const attomData = data._attomData || {};
        const propertyDetails = data.propertyDetails || {};
        const extendedDetails = data.extendedDetails || {};
        
        // Year built
        const yearBuilt = propertyDetails.yearBuilt || 
                         attomData.summary?.yearbuilt || 
                         extendedDetails.building?.yearBuilt;
        if (yearBuilt) {
          const age = new Date().getFullYear() - yearBuilt;
          insights.push(`Built ${yearBuilt} (${age} years old)`);
        }
        
        // Square footage
        const sqft = propertyDetails.sqft || 
                    attomData.building?.size?.livingsize || 
                    extendedDetails.building?.livingSize;
        if (sqft) {
          insights.push(`${sqft.toLocaleString()} sq ft`);
        }
        
        // Lot size
        const lotSqFt = attomData.lot?.lotsize2 || 
                       extendedDetails.lot?.sizeSqFt;
        if (lotSqFt) {
          const acres = (lotSqFt / 43560).toFixed(2);
          insights.push(`${acres} acre lot (${lotSqFt.toLocaleString()} sq ft)`);
        }
        
        // Heating type
        const heatingType = attomData.utilities?.heatingtype || 
                           extendedDetails.utilities?.heatingType;
        if (heatingType) {
          insights.push(`Heating: ${heatingType}`);
        }
        
        // Roof material
        const roofMaterial = attomData.building?.construction?.roofcover || 
                            extendedDetails.building?.roofMaterial;
        if (roofMaterial) {
          insights.push(`Roof: ${roofMaterial}`);
        }
        
        // Property type
        const propertyType = propertyDetails.propertyType || 
                            attomData.summary?.propertyType;
        if (propertyType) {
          insights.push(`Type: ${propertyType}`);
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