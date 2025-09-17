import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Upload, AlertCircle } from "lucide-react";
import { ValidationCockpitDB, PropertySample, EnrichmentSnapshot, Prediction } from "@/lib/validation-cockpit";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

interface LabelForm {
  labeler: string;
  roof_material: string;
  roof_age_bucket: string;
  roof_visible_damage: boolean;
  roof_estimated_remaining_years: number;
  hvac_present: boolean;
  hvac_system_type: string;
  hvac_age_bucket: string;
  hvac_estimated_remaining_years: number;
  water_heater_present: boolean;
  water_heater_type: string;
  water_heater_age_bucket: string;
  windows_age_bucket: string;
  doors_age_bucket: string;
  basement_or_crawlspace: string;
  moisture_risk: boolean;
  electrical_gfci_kitchen: boolean;
  electrical_gfci_bath: boolean;
  last_roof_permit_year?: number;
  last_hvac_permit_year?: number;
  last_water_heater_permit_year?: number;
  labeler_confidence_0_1: number;
  labeler_notes: string;
  evidence_photo_urls: string;
}

const AGE_BUCKETS = ['0-5', '5-10', '10-15', '15-20', '20-25', '25+'];
const ROOF_MATERIALS = ['Asphalt Shingle', 'Tile', 'Metal', 'Flat/TPO', 'Wood', 'Slate', 'Other'];
const HVAC_TYPES = ['Central AC', 'Heat Pump', 'Window Units', 'Mini Split', 'Evaporative', 'None'];
const WATER_HEATER_TYPES = ['Electric Tank', 'Gas Tank', 'Tankless Electric', 'Tankless Gas', 'Heat Pump', 'Solar'];
const BASEMENT_OPTIONS = ['Full Basement', 'Partial Basement', 'Crawlspace', 'Slab Foundation'];

export default function PropertyLabelingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [property, setProperty] = useState<PropertySample | null>(null);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentSnapshot[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<LabelForm>({
    defaultValues: {
      labeler: '',
      labeler_confidence_0_1: 0.8,
      roof_visible_damage: false,
      hvac_present: true,
      water_heater_present: true,
      moisture_risk: false,
      electrical_gfci_kitchen: false,
      electrical_gfci_bath: false,
    }
  });

  useEffect(() => {
    if (id) {
      loadPropertyData(id);
    }
  }, [id]);

  const loadPropertyData = async (addressId: string) => {
    try {
      const [propertyData, enrichmentSnapshots, predictionData] = await Promise.all([
        ValidationCockpitDB.getPropertySample(addressId),
        ValidationCockpitDB.getEnrichmentSnapshots(addressId),
        ValidationCockpitDB.getPredictions(addressId)
      ]);

      setProperty(propertyData);
      setEnrichmentData(enrichmentSnapshots);
      setPredictions(predictionData);

      // Check if there's already a label for this property
      const existingLabel = await ValidationCockpitDB.getLatestLabel(addressId);
      if (existingLabel) {
        // Pre-populate form with existing label data
        Object.entries(existingLabel).forEach(([key, value]) => {
          if (key !== 'label_id' && key !== 'address_id' && key !== 'label_date' && key !== 'created_at' && value !== null) {
            setValue(key as keyof LabelForm, value as any);
          }
        });
      }
    } catch (error) {
      console.error('Error loading property data:', error);
      toast.error('Failed to load property data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LabelForm) => {
    if (!id) return;

    setSaving(true);
    try {
      await ValidationCockpitDB.createLabel(id, {
        ...data,
        label_date: new Date().toISOString().split('T')[0],
      });

      // Update property status to labeled
      await ValidationCockpitDB.updatePropertySample(id, { status: 'labeled' });

      toast.success('Label saved successfully');
      navigate('/validation');
    } catch (error) {
      console.error('Error saving label:', error);
      toast.error('Failed to save label');
    } finally {
      setSaving(false);
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/validation')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cockpit
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Property Labeling</h1>
          <p className="text-muted-foreground">
            {property.street_address}, {property.city}, {property.state} {property.zip}
          </p>
        </div>
        <Badge variant={property.status === 'labeled' ? 'default' : 'secondary'}>
          {property.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Context Data */}
        <div className="lg:col-span-1 space-y-4">
          {/* Enrichment Data */}
          {enrichmentData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Enrichment Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {enrichmentData.map((snapshot) => (
                  <div key={snapshot.snapshot_id} className="text-xs">
                    <Badge variant="outline" className="mb-1">
                      {snapshot.provider}
                    </Badge>
                    <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded max-h-32 overflow-y-auto">
                      {JSON.stringify(snapshot.payload, null, 2)}
                    </pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Predictions */}
          {predictions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Predictions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {predictions.map((prediction) => (
                  <div key={prediction.prediction_id} className="text-xs p-2 bg-muted rounded">
                    <div className="font-medium">{prediction.field}</div>
                    <div>{prediction.predicted_value}</div>
                    <div className="text-muted-foreground">
                      Confidence: {(prediction.confidence_0_1 * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Labeling Form */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Ground Truth Labeling</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Labeler Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="labeler">Labeler Name *</Label>
                    <Input
                      id="labeler"
                      {...register("labeler", { required: "Labeler name is required" })}
                      placeholder="Your name"
                    />
                    {errors.labeler && (
                      <p className="text-sm text-destructive">{errors.labeler.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confidence">Confidence (0-1)</Label>
                    <Input
                      id="confidence"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      {...register("labeler_confidence_0_1", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {/* Roof Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Roof</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Material</Label>
                      <Select onValueChange={(value) => setValue("roof_material", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOF_MATERIALS.map((material) => (
                            <SelectItem key={material} value={material}>
                              {material}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Age Bucket</Label>
                      <Select onValueChange={(value) => setValue("roof_age_bucket", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select age" />
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_BUCKETS.map((bucket) => (
                            <SelectItem key={bucket} value={bucket}>
                              {bucket} years
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estimated Remaining Years</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        {...register("roof_estimated_remaining_years", { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="roof_damage"
                      {...register("roof_visible_damage")}
                    />
                    <Label htmlFor="roof_damage">Visible damage present</Label>
                  </div>
                </div>

                {/* HVAC Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">HVAC</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="hvac_present"  
                      {...register("hvac_present")}
                    />
                    <Label htmlFor="hvac_present">HVAC system present</Label>
                  </div>

                  {watch("hvac_present") && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>System Type</Label>
                        <Select onValueChange={(value) => setValue("hvac_system_type", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {HVAC_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Age Bucket</Label>
                        <Select onValueChange={(value) => setValue("hvac_age_bucket", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select age" />
                          </SelectTrigger>
                          <SelectContent>
                            {AGE_BUCKETS.map((bucket) => (
                              <SelectItem key={bucket} value={bucket}>
                                {bucket} years
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Estimated Remaining Years</Label>
                        <Input
                          type="number"
                          min="0"
                          max="30"
                          {...register("hvac_estimated_remaining_years", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Water Heater Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Water Heater</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="water_heater_present"
                      {...register("water_heater_present")}
                    />
                    <Label htmlFor="water_heater_present">Water heater present</Label>
                  </div>

                  {watch("water_heater_present") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select onValueChange={(value) => setValue("water_heater_type", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {WATER_HEATER_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Age Bucket</Label>
                        <Select onValueChange={(value) => setValue("water_heater_age_bucket", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select age" />
                          </SelectTrigger>
                          <SelectContent>
                            {AGE_BUCKETS.map((bucket) => (
                              <SelectItem key={bucket} value={bucket}>
                                {bucket} years
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Windows Age</Label>
                      <Select onValueChange={(value) => setValue("windows_age_bucket", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select age" />
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_BUCKETS.map((bucket) => (
                            <SelectItem key={bucket} value={bucket}>
                              {bucket} years
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Doors Age</Label>
                      <Select onValueChange={(value) => setValue("doors_age_bucket", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select age" />
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_BUCKETS.map((bucket) => (
                            <SelectItem key={bucket} value={bucket}>
                              {bucket} years
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Foundation</Label>
                      <Select onValueChange={(value) => setValue("basement_or_crawlspace", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {BASEMENT_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="moisture_risk"
                          {...register("moisture_risk")}
                        />
                        <Label htmlFor="moisture_risk">Moisture risk</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gfci_kitchen"
                          {...register("electrical_gfci_kitchen")}
                        />
                        <Label htmlFor="gfci_kitchen">GFCI in kitchen</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gfci_bath"
                          {...register("electrical_gfci_bath")}
                        />
                        <Label htmlFor="gfci_bath">GFCI in bathrooms</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permit Years */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Last Permit Years</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Roof Permit Year</Label>
                      <Input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        {...register("last_roof_permit_year", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>HVAC Permit Year</Label>
                      <Input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        {...register("last_hvac_permit_year", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Water Heater Permit Year</Label>
                      <Input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        {...register("last_water_heater_permit_year", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes and Evidence */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="evidence_photos">Evidence Photo URLs</Label>
                    <Textarea
                      id="evidence_photos"
                      {...register("evidence_photo_urls")}
                      placeholder="Comma-separated URLs of evidence photos"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Labeler Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("labeler_notes")}
                      placeholder="Additional observations or notes"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => navigate('/validation')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Label'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}