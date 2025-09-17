import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Building, Wrench } from "lucide-react";

interface ProvenanceExplainerProps {
  provenance?: Record<string, any>;
  field: string;
  predictedValue: string;
  confidence: number;
}

export function ProvenanceExplainer({ provenance, field, predictedValue, confidence }: ProvenanceExplainerProps) {
  if (!provenance) {
    return (
      <Card className="border-l-4 border-l-amber-500 bg-amber-50/50">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            No data provenance available for this prediction.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getFieldIcon = (field: string) => {
    if (field.includes('roof')) return <Building className="h-4 w-4" />;
    if (field.includes('hvac')) return <Wrench className="h-4 w-4" />;
    if (field.includes('water_heater')) return <Wrench className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const explainProvenance = () => {
    const explanations: string[] = [];
    
    // Check for permit data
    if (provenance.shovels_permits?.length > 0) {
      const permits = provenance.shovels_permits;
      const relevantPermits = permits.filter((p: any) => 
        p.system_tags?.some((tag: string) => field.toLowerCase().includes(tag.toLowerCase()))
      );
      
      if (relevantPermits.length > 0) {
        const latestPermit = relevantPermits.reduce((latest: any, current: any) => 
          new Date(current.date_issued || current.date_finaled) > new Date(latest.date_issued || latest.date_finaled) ? current : latest
        );
        
        explanations.push(
          `Latest ${field.replace(/_/g, ' ')} permit found: ${latestPermit.permit_type || 'permit'} issued ${new Date(latestPermit.date_issued || latestPermit.date_finaled).getFullYear()}`
        );
      }
    }

    // Check for ATTOM property data
    if (provenance.attom_property) {
      const attomData = provenance.attom_property;
      if (attomData.year_built) {
        const propertyAge = new Date().getFullYear() - attomData.year_built;
        explanations.push(`Property built in ${attomData.year_built} (${propertyAge} years old)`);
      }
      
      if (field.includes('roof') && attomData.roof_material) {
        explanations.push(`Roof material: ${attomData.roof_material}`);
      }
      
      if (field.includes('hvac') && attomData.heating_type) {
        explanations.push(`Heating system: ${attomData.heating_type}`);
      }
    }

    // Check for imagery analysis
    if (provenance.imagery_analysis) {
      const imagery = provenance.imagery_analysis;
      if (imagery.roof_analysis) {
        explanations.push(`Satellite imagery analysis: ${imagery.roof_analysis.condition || 'condition assessed'}`);
      }
    }

    // Check for financial data
    if (provenance.smarty_financial) {
      const financial = provenance.smarty_financial;
      if (financial.assessed_value) {
        explanations.push(`Property assessed at $${financial.assessed_value.toLocaleString()}`);
      }
    }

    // Default reasoning if no specific data found
    if (explanations.length === 0) {
      explanations.push(`Prediction based on regional defaults and property characteristics`);
    }

    return explanations;
  };

  const getConfidenceReason = () => {
    if (confidence >= 0.8) {
      return "High confidence due to multiple data sources confirming the prediction";
    } else if (confidence >= 0.6) {
      return "Medium confidence based on available property records";
    } else if (confidence >= 0.4) {
      return "Moderate confidence using regional defaults and property age";
    } else {
      return "Low confidence - limited data available for this property";
    }
  };

  const explanations = explainProvenance();

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {getFieldIcon(field)}
          How we predicted "{predictedValue}"
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {explanations.map((explanation, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm">{explanation}</p>
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={confidence >= 0.8 ? 'default' : confidence >= 0.6 ? 'secondary' : 'destructive'}>
              {(confidence * 100).toFixed(0)}% confidence
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{getConfidenceReason()}</p>
        </div>

        {/* Data sources used */}
        <div className="pt-2 border-t">
          <p className="text-xs font-medium mb-1">Data Sources:</p>
          <div className="flex flex-wrap gap-1">
            {provenance.shovels_permits && (
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Permits
              </Badge>
            )}
            {provenance.attom_property && (
              <Badge variant="outline" className="text-xs">
                <Building className="h-3 w-3 mr-1" />
                ATTOM
              </Badge>
            )}
            {provenance.imagery_analysis && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Imagery
              </Badge>
            )}
            {provenance.smarty_financial && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Smarty
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}