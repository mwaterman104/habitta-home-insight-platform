import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Home, ArrowLeft, LogOut, MapPin, Check, AlertCircle } from 'lucide-react';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { PropertyDetailsAutoFill } from '@/components/PropertyDetailsAutoFill';
import { smartyStandardizeGeocode, smartyEnrich, computeCanonicalHash } from '@/lib/smarty';
import { mapStandardized, mapGeocode, mapEnrichment } from '@/adapters/smartyMappers';

interface HomeDetails {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  yearBuilt: string;
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  isVerified: boolean;
  precision?: string;
  dpvMatch?: string;
}

const AddHomePage = () => {
  const [formData, setFormData] = useState<HomeDetails>({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: '',
    yearBuilt: '',
    squareFeet: '',
    bedrooms: '',
    bathrooms: '',
    isVerified: false,
    precision: undefined,
    dpvMatch: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleAddressSelect = async (suggestion: any) => {
    const stepId = crypto.randomUUID().slice(0, 8);
    console.log(`[${stepId}] Address selection:`, suggestion.street_line);
    
    setVerifyingAddress(true);
    
    try {
      // Update form with selected address
      setFormData(prev => ({
        ...prev,
        address: suggestion.street_line || '',
        city: suggestion.city || '',
        state: suggestion.state || '',
        zipCode: suggestion.zipcode || '',
        isVerified: false, // Will be set to true after standardization
      }));

      // Standardize and geocode the selected address
      console.log(`[${stepId}] Standardizing address...`);
      const fiveDigitZip = suggestion.zipcode?.split('-')[0] || '';
      const { standardized, geocode } = await smartyStandardizeGeocode({
        street: suggestion.street_line,
        city: suggestion.city,
        state: suggestion.state,
        postal_code: fiveDigitZip
      });

      const addressData = mapStandardized(standardized);
      const geocodeData = mapGeocode(geocode);

      // Check if standardization returned empty candidates
      if (!standardized || (Array.isArray(standardized) && standardized.length === 0)) {
        console.warn(`[${stepId}] No standardization candidates found`);
        throw new Error('Address could not be standardized - no matching candidates found');
      }
      
      console.log(`[${stepId}] Standardization complete`, {
        dpvMatch: addressData.dpv_match,
        precision: geocodeData.precision
      });

      // Update form with standardized data
      setFormData(prev => ({
        ...prev,
        address: addressData.line1 || suggestion.street_line, // Fallback to original if no standardized address
        city: addressData.city || suggestion.city,
        state: addressData.state || suggestion.state,
        zipCode: addressData.postal_code || suggestion.zipcode,
        isVerified: true,
        precision: geocodeData.precision,
        dpvMatch: addressData.dpv_match,
      }));
      
      toast({
        title: "Address Verified",
        description: `Address standardized with ${geocodeData.precision || 'standard'} precision.`,
      });

    } catch (error: any) {
      console.error(`[${stepId}] Address verification failed:`, error);
      toast({
        title: "Address Verification Failed",
        description: "Could not verify address. You can still proceed with manual entry.",
        variant: "destructive",
      });
      
      // Still update form with the selected address for manual correction
      setFormData(prev => ({
        ...prev,
        address: suggestion.street_line || prev.address,
        city: suggestion.city || prev.city,
        state: suggestion.state || prev.state,
        zipCode: suggestion.zipcode || prev.zipCode,
        isVerified: false,
      }));
    } finally {
      setVerifyingAddress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.isVerified) {
      toast({
        title: "Address Not Verified",
        description: "Please select an address from the autocomplete suggestions.",
        variant: "destructive",
      });
      return;
    }

    const stepId = crypto.randomUUID().slice(0, 8);
    console.log(`[${stepId}] Starting home creation flow`);
    setLoading(true);

    try {
      // Step 1: Compute canonical hash for deduplication
      const canonicalHash = computeCanonicalHash(
        formData.address,
        formData.city, 
        formData.state,
        formData.zipCode
      );
      console.log(`[${stepId}] Canonical hash:`, canonicalHash);

      // Step 2: Check for existing address
      let addressRecord;
      const { data: existingAddress } = await supabase
        .from("addresses")
        .select("*")
        .eq("created_by", user.id)
        .eq("canonical_hash", canonicalHash)
        .maybeSingle();

      if (existingAddress) {
        console.log(`[${stepId}] Using existing address:`, existingAddress.id);
        addressRecord = existingAddress;
      } else {
        console.log(`[${stepId}] Creating new address record`);
        
        // Re-standardize and geocode for canonical data
        const fiveDigitZip = formData.zipCode.split('-')[0];
        const { standardized, geocode } = await smartyStandardizeGeocode({
          street: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: fiveDigitZip
        });

        const addressData = mapStandardized(standardized);
        const geocodeData = mapGeocode(geocode);

        // Compute server-side canonical hash
        const { data: serverHash } = await supabase
          .rpc('compute_canonical_hash', {
            line1: addressData.line1,
            city: addressData.city,
            state: addressData.state,
            postal_code: addressData.postal_code
          });

        // Step 3: Insert canonical address
        const { data: newAddress, error: addressError } = await supabase
          .from("addresses")
          .insert({
            ...addressData,
            canonical_hash: serverHash,
            created_by: user.id
          })
          .select()
          .single();

        if (addressError) throw addressError;
        addressRecord = newAddress;

        // Step 4: Save geocode data
        if (geocodeData.latitude && geocodeData.longitude) {
          const { error: geocodeError } = await supabase
            .from("address_geocode")
            .insert({
              address_id: addressRecord.id,
              ...geocodeData
            });

          if (geocodeError) console.warn(`[${stepId}] Geocode save failed:`, geocodeError);
        }
      }

      // Step 5: Best-effort property enrichment
      let enrichmentData = {
        attributes: {
          year_built: null,
          square_feet: null,
          beds: null,
          baths: null,
          property_type: null,
        },
        raw: null
      };

      try {
        console.log(`[${stepId}] Attempting property enrichment...`);
        const fiveDigitZip = formData.zipCode.split('-')[0];
        const enrichResponse = await smartyEnrich({
          street: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: fiveDigitZip
        });

        enrichmentData = mapEnrichment(enrichResponse);
        console.log(`[${stepId}] Enrichment successful`);

        // Check if enrichment record exists
        const { data: existingEnrichment } = await supabase
          .from("property_enrichment")
          .select("id")
          .eq("address_id", addressRecord.id)
          .maybeSingle();

        if (!existingEnrichment) {
          const { error: enrichError } = await supabase
            .from("property_enrichment")
            .insert({
              address_id: addressRecord.id,
              attributes: enrichmentData.attributes,
              raw: enrichmentData.raw
            });

          if (enrichError) console.warn(`[${stepId}] Enrichment save failed:`, enrichError);
        }
      } catch (enrichError) {
        console.warn(`[${stepId}] Enrichment failed (non-blocking):`, enrichError);
      }

      // Step 6: Create home record with form data as primary, enrichment as fallback
      console.log(`[${stepId}] Creating home record...`);
      const { data: homeRecord, error: homeError } = await supabase
        .from("homes")
        .insert({
          user_id: user.id,
          address_id: addressRecord.id,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          latitude: null, // Will be populated by geocode join
          longitude: null, // Will be populated by geocode join
          property_type: formData.propertyType || enrichmentData.attributes.property_type || null,
          year_built: formData.yearBuilt ? parseInt(formData.yearBuilt) : enrichmentData.attributes.year_built || null,
          square_feet: formData.squareFeet ? parseInt(formData.squareFeet) : enrichmentData.attributes.square_feet || null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : enrichmentData.attributes.beds || null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : enrichmentData.attributes.baths || null,
        })
        .select()
        .single();

      if (homeError) throw homeError;

      console.log(`[${stepId}] Home created successfully:`, homeRecord.id);
      toast({
        title: "Home Added Successfully",
        description: "Your home has been verified and added to your profile.",
      });

      navigate(`/home/${homeRecord.id}`);
      
    } catch (error: any) {
      console.error(`[${stepId}] Home creation failed:`, error);
      toast({
        title: "Error Adding Home",
        description: error.message || "Failed to add home. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center">
              <Home className="h-6 w-6 mr-2 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Add Your Home</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              navigate('/auth');
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Add Your Property</CardTitle>
              <CardDescription>
                Search and verify your address to get started with personalized maintenance insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Property Address</h3>
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <AutocompleteInput
                      onSelect={handleAddressSelect}
                      placeholder="Start typing your address..."
                      className="w-full"
                      displayValue={formData.address || undefined}
                    />
                    {verifyingAddress && (
                      <div className="flex items-center text-sm text-muted-foreground mt-2">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Verifying address...
                      </div>
                    )}
                    {formData.isVerified && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <div className="flex items-center">
                          <Badge variant="secondary" className="mr-2">
                            <Check className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                          {formData.precision && (
                            <Badge variant="outline" className="mr-2">
                              {formData.precision} precision
                            </Badge>
                          )}
                          {formData.dpvMatch === 'Y' && (
                            <Badge variant="outline" className="text-green-600">
                              Deliverable
                            </Badge>
                          )}
                          {formData.dpvMatch === 'N' && (
                            <Badge variant="outline" className="text-amber-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Not Deliverable
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {formData.isVerified && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Address standardized and geocoded
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        readOnly={formData.isVerified}
                        className={formData.isVerified ? "bg-muted" : ""}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        readOnly={formData.isVerified}
                        className={formData.isVerified ? "bg-muted" : ""}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                      readOnly={formData.isVerified}
                      className={formData.isVerified ? "bg-muted" : ""}
                      required
                    />
                  </div>
                </div>

                <PropertyDetailsAutoFill
                  formData={formData}
                  setFormData={setFormData}
                  isAddressVerified={formData.isVerified}
                  verifiedAddress={formData.isVerified ? {
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode
                  } : undefined}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !formData.isVerified}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying & Adding Home...
                    </>
                  ) : (
                    "Verify & Add Home"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AddHomePage;