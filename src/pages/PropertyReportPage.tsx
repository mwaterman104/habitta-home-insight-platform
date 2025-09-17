import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";
import { ValidationCockpitDB, PropertySample, EnrichmentSnapshot, Prediction } from "@/lib/validation-cockpit";
import { ProvenanceExplainer } from "@/components/validation/ProvenanceExplainer";
import { EnrichmentSummary } from "@/components/validation/EnrichmentSummary";
import { toast } from "sonner";

export default function PropertyReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [property, setProperty] = useState<PropertySample | null>(null);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentSnapshot[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [expandedPredictions, setExpandedPredictions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      loadReportData(id);
    }
  }, [id]);

  const loadReportData = async (addressId: string) => {
    try {
      const [propertyData, enrichmentSnapshots, predictionData] = await Promise.all([
        ValidationCockpitDB.getPropertySample(addressId),
        ValidationCockpitDB.getEnrichmentSnapshots(addressId),
        ValidationCockpitDB.getPredictions(addressId)
      ]);

      setProperty(propertyData);
      setEnrichmentData(enrichmentSnapshots);
      setPredictions(predictionData);

      // Get all labels for this property
      const labelData = await ValidationCockpitDB.getLatestLabel(addressId);
      if (labelData) {
        setLabels([labelData]);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    // Generate report data for export
    const reportData = {
      property: property,
      enrichment: enrichmentData,
      predictions: predictions,
      labels: labels,
      generated_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `property_report_${property?.street_address.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Report exported successfully');
  };

  const handleRetryEnrichment = async () => {
    if (!id) return;
    
    try {
      setEnriching(true);
      await ValidationCockpitDB.retryEnrichment(id);
      toast.success('Enrichment started successfully');
      
      // Reload the data after a short delay
      setTimeout(() => {
        loadReportData(id);
      }, 2000);
    } catch (error) {
      console.error('Error retrying enrichment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry enrichment');
    } finally {
      setEnriching(false);
    }
  };

  const togglePredictionExpansion = (predictionId: string) => {
    const newExpanded = new Set(expandedPredictions);
    if (newExpanded.has(predictionId)) {
      newExpanded.delete(predictionId);
    } else {
      newExpanded.add(predictionId);
    }
    setExpandedPredictions(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading report data...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <div className="text-muted-foreground">Property not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/validation')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cockpit
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Property Report</h1>
            <p className="text-muted-foreground">
              {property.street_address}, {property.city}, {property.state} {property.zip}
            </p>
          </div>
          <Badge variant={property.status === 'labeled' ? 'default' : 'secondary'}>
            {property.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {(property.status === 'pending' || property.enrichment_status === 'failed') && (
            <Button 
              variant="outline" 
              onClick={handleRetryEnrichment}
              disabled={enriching}
            >
              {enriching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {property.enrichment_status === 'failed' ? 'Retry Enrichment' : 'Enrich Property'}
                </>
              )}
            </Button>
          )}
          <Button onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Property Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Property Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="font-medium">{property.street_address}</div>
              {property.unit && <div className="text-sm">Unit {property.unit}</div>}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Location</div>
              <div className="font-medium">{property.city}, {property.state}</div>
              <div className="text-sm">{property.zip}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">APN</div>
              <div className="font-medium">{property.apn || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant="outline">{property.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictions vs Labels Comparison */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Predictions{labels.length > 0 ? ' vs Ground Truth' : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictions.map((prediction) => {
                const labelValue = labels[0] ? labels[0][prediction.field] : null;
                const isMatch = labelValue !== null ? labelValue === prediction.predicted_value : null;
                const isExpanded = expandedPredictions.has(prediction.prediction_id);
                
                return (
                  <div key={prediction.prediction_id} className="border rounded-lg overflow-hidden">
                    {/* Main prediction row */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex-1">
                        <div className="font-medium">{prediction.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                        <div className="text-sm text-muted-foreground">
                          Confidence: {(prediction.confidence_0_1 * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Predicted</div>
                          <div className="font-medium">{prediction.predicted_value}</div>
                        </div>
                        {labelValue !== null && (
                          <>
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">Actual</div>
                              <div className="font-medium">{labelValue}</div>
                            </div>
                            <Badge variant={isMatch ? 'default' : 'destructive'}>
                              {isMatch ? 'Match' : 'Mismatch'}
                            </Badge>
                          </>
                        )}
                        {labelValue === null && (
                          <Badge variant="secondary">No Label</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePredictionExpansion(prediction.prediction_id)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded provenance section */}
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <ProvenanceExplainer
                          provenance={prediction.data_provenance}
                          field={prediction.field}
                          predictedValue={prediction.predicted_value}
                          confidence={prediction.confidence_0_1}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Labels Details */}
      {labels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ground Truth Labels</CardTitle>
          </CardHeader>
          <CardContent>
            {labels.map((label, index) => (
              <div key={index} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Labeler</div>
                    <div className="font-medium">{label.labeler}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Confidence</div>
                    <div className="font-medium">{(label.labeler_confidence_0_1 * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date</div>
                    <div className="font-medium">{new Date(label.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                {label.labeler_notes && (
                  <div>
                    <div className="text-sm text-muted-foreground">Notes</div>
                    <div className="text-sm bg-muted p-2 rounded">{label.labeler_notes}</div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Enrichment Data */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources & Insights</CardTitle>
          <p className="text-sm text-muted-foreground">
            Key information extracted from external data sources used to generate predictions
          </p>
        </CardHeader>
        <CardContent>
          <EnrichmentSummary snapshots={enrichmentData} />
        </CardContent>
      </Card>

      {/* Report Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            Report generated on {new Date().toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}