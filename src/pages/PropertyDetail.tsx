import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { JSONPreview } from "@/components/validation/JSONPreview";
import { ProvenancePopover } from "@/components/validation/ProvenancePopover";
import { ValidationCockpitDB, PropertySample, EnrichmentSnapshot, Prediction, Label } from "@/lib/validation-cockpit";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PropertyDetail() {
  const { addressId } = useParams<{ addressId: string }>();
  const navigate = useNavigate();
  
  const [property, setProperty] = useState<PropertySample | null>(null);
  const [snapshots, setSnapshots] = useState<EnrichmentSnapshot[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [label, setLabel] = useState<Label | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (addressId) {
      loadPropertyData();
    }
  }, [addressId]);

  const loadPropertyData = async () => {
    if (!addressId) return;
    
    try {
      const [propertyData, snapshotData, predictionData, labelData] = await Promise.all([
        ValidationCockpitDB.getPropertySample(addressId),
        ValidationCockpitDB.getEnrichmentSnapshots(addressId),
        ValidationCockpitDB.getPredictions(addressId),
        ValidationCockpitDB.getLabel(addressId),
      ]);
      
      setProperty(propertyData);
      setSnapshots(snapshotData);
      setPredictions(predictionData);
      setLabel(labelData);
    } catch (error) {
      console.error('Error loading property data:', error);
      toast.error('Failed to load property data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading property data...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">Property not found</div>
        <Button onClick={() => navigate("/validation")} className="mt-4">
          Back to Validation Cockpit
        </Button>
      </div>
    );
  }

  const groupedSnapshots = snapshots.reduce((acc, snapshot) => {
    if (!acc[snapshot.provider]) {
      acc[snapshot.provider] = [];
    }
    acc[snapshot.provider].push(snapshot);
    return acc;
  }, {} as Record<string, EnrichmentSnapshot[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/validation")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cockpit
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{property.street_address}</h1>
            <p className="text-muted-foreground">
              {property.city}, {property.state} {property.zip}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/validation/report/${addressId}`)}>
            <FileText className="h-4 w-4 mr-2" />
            View Report
          </Button>
        </div>
      </div>

      {/* Property Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Property Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <Badge>{property.status}</Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">APN</div>
              <div>{property.apn || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Assigned To</div>
              <div>{property.assigned_to || 'Unassigned'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div>{new Date(property.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="enrichment" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
        </TabsList>

        {/* Enrichment Tab */}
        <TabsContent value="enrichment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrichment Snapshots</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(groupedSnapshots).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No enrichment data available. Run enrichment first.
                </div>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {Object.entries(groupedSnapshots).map(([provider, providerSnapshots]) => (
                    <AccordionItem key={provider} value={provider}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full mr-4">
                          <span className="capitalize font-medium">{provider}</span>
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              {providerSnapshots.length} snapshot{providerSnapshots.length !== 1 ? 's' : ''}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(providerSnapshots[0].retrieved_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {providerSnapshots.map((snapshot) => (
                          <JSONPreview
                            key={snapshot.snapshot_id}
                            data={snapshot.payload}
                            title={`Retrieved at ${new Date(snapshot.retrieved_at).toLocaleString()}`}
                          />
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {predictions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No predictions available. Run prediction model first.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-2 font-medium">Field</th>
                        <th className="text-left p-2 font-medium">Predicted Value</th>
                        <th className="text-left p-2 font-medium">Confidence</th>
                        <th className="text-left p-2 font-medium">Model Version</th>
                        <th className="text-left p-2 font-medium">Provenance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((prediction) => (
                        <tr key={prediction.prediction_id} className="border-b">
                          <td className="p-2 font-medium">{prediction.field}</td>
                          <td className="p-2">{prediction.predicted_value}</td>
                          <td className="p-2">
                            <Badge variant="outline">
                              {(prediction.confidence_0_1 * 100).toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {prediction.model_version}
                          </td>
                          <td className="p-2">
                            <ProvenancePopover provenance={prediction.data_provenance} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labels Tab */}
        <TabsContent value="labels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ground Truth Labels</CardTitle>
            </CardHeader>
            <CardContent>
              {label ? (
                <div className="space-y-6">
                  <div className="text-sm text-muted-foreground">
                    Labeled by {label.labeler} on {new Date(label.label_date).toLocaleDateString()}
                  </div>
                  
                  {/* Roof Section */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Roof</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {label.roof_material && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Material</div>
                          <div>{label.roof_material}</div>
                        </div>
                      )}
                      {label.roof_age_bucket && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Age Bucket</div>
                          <div>{label.roof_age_bucket}</div>
                        </div>
                      )}
                      {label.roof_visible_damage !== undefined && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Visible Damage</div>
                          <div>{label.roof_visible_damage ? 'Yes' : 'No'}</div>
                        </div>
                      )}
                      {label.roof_estimated_remaining_years && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Est. Remaining Years</div>
                          <div>{label.roof_estimated_remaining_years}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HVAC Section */}
                  <div className="space-y-2">
                    <h3 className="font-medium">HVAC</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {label.hvac_present !== undefined && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Present</div>
                          <div>{label.hvac_present ? 'Yes' : 'No'}</div>
                        </div>
                      )}
                      {label.hvac_system_type && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">System Type</div>
                          <div>{label.hvac_system_type}</div>
                        </div>
                      )}
                      {label.hvac_age_bucket && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Age Bucket</div>
                          <div>{label.hvac_age_bucket}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Water Heater Section */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Water Heater</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {label.water_heater_present !== undefined && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Present</div>
                          <div>{label.water_heater_present ? 'Yes' : 'No'}</div>
                        </div>
                      )}
                      {label.water_heater_type && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Type</div>
                          <div>{label.water_heater_type}</div>
                        </div>
                      )}
                      {label.water_heater_age_bucket && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Age Bucket</div>
                          <div>{label.water_heater_age_bucket}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {label.labeler_notes && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Notes</h3>
                      <div className="p-3 bg-muted rounded-md">
                        {label.labeler_notes}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No labels available yet. Create labels to establish ground truth data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}