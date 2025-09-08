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
import { Loader2, Home, ArrowLeft, LogOut, MapPin, Check } from 'lucide-react';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { smartyStandardizeGeocode, smartyEnrich } from '@/lib/smarty';
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
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleAddressSelect = async (suggestion: any) => {
    console.log("Address suggestion selected:", suggestion);
    
    // Update form with selected address
    setFormData(prev => ({
      ...prev,
      address: suggestion.street_line || '',
      city: suggestion.city || '',
      state: suggestion.state || '',
      zipCode: suggestion.zipcode || '',
      isVerified: true,
    }));

    // Auto-enrich with property data
    try {
      const enrichData = await smartyEnrich({
        street: suggestion.street_line,
        city: suggestion.city,
        state: suggestion.state,
        postal_code: suggestion.zipcode
      });

      const enrichment = mapEnrichment(enrichData);
      
      setFormData(prev => ({
        ...prev,
        yearBuilt: enrichment.attributes.year_built?.toString() || prev.yearBuilt,
        squareFeet: enrichment.attributes.square_feet?.toString() || prev.squareFeet,
        bedrooms: enrichment.attributes.beds?.toString() || prev.bedrooms,
        bathrooms: enrichment.attributes.baths?.toString() || prev.bathrooms,
        propertyType: enrichment.attributes.property_type || prev.propertyType,
      }));
      
      toast({
        title: "Address Verified",
        description: "Property data has been enriched automatically.",
      });
    } catch (error) {
      console.error("Error enriching address:", error);
      toast({
        title: "Address Verified",
        description: "Address verified successfully. Some property details may need manual entry.",
      });
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

    setLoading(true);

    try {
      // Step 1: Standardize and geocode the address
      const { standardized, geocode } = await smartyStandardizeGeocode({
        street: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.zipCode
      });

      const addressData = mapStandardized(standardized);
      const geocodeData = mapGeocode(geocode);

      // Step 2: Save canonical address
      const { data: addressRecord, error: addressError } = await supabase
        .from("addresses")
        .insert({
          ...addressData,
          created_by: user.id
        })
        .select()
        .single();

      if (addressError) throw addressError;

      // Step 3: Save geocode data
      if (geocodeData.latitude && geocodeData.longitude) {
        const { error: geocodeError } = await supabase
          .from("address_geocode")
          .insert({
            address_id: addressRecord.id,
            ...geocodeData
          });

        if (geocodeError) console.error('Geocode save error:', geocodeError);
      }

      // Step 4: Get property enrichment
      let enrichment = { 
        attributes: {
          year_built: null,
          square_feet: null,
          beds: null,
          baths: null,
          property_type: null,
          lot_size: null,
          last_sale_price: null,
          last_sale_date: null
        },
        raw: null
      };
      try {
        const enrichData = await smartyEnrich({
          street: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.zipCode
        });
        enrichment = mapEnrichment(enrichData);

        // Step 5: Save enrichment data
        const { error: enrichError } = await supabase
          .from("property_enrichment")
          .insert({
            address_id: addressRecord.id,
            attributes: enrichment.attributes,
            raw: enrichment.raw
          });

        if (enrichError) console.error('Enrichment save error:', enrichError);
      } catch (enrichError) {
        console.error('Enrichment error:', enrichError);
      }

      // Step 6: Create home record
      const { data: homeRecord, error: homeError } = await supabase
        .from("homes")
        .insert({
          user_id: user.id,
          address_id: addressRecord.id,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          latitude: geocodeData.latitude,
          longitude: geocodeData.longitude,
          property_type: formData.propertyType || enrichment.attributes.property_type || null,
          year_built: formData.yearBuilt ? parseInt(formData.yearBuilt) : enrichment.attributes.year_built || null,
          square_feet: formData.squareFeet ? parseInt(formData.squareFeet) : enrichment.attributes.square_feet || null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : enrichment.attributes.beds || null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : enrichment.attributes.baths || null,
        })
        .select()
        .single();

      if (homeError) throw homeError;

      toast({
        title: "Home Added Successfully",
        description: "Your home has been verified and added to your profile.",
      });

      navigate(`/home/${homeRecord.id}`);
    } catch (error: any) {
      console.error("Error adding home:", error);
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
                    />
                    {formData.isVerified && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Badge variant="secondary" className="mr-2">
                          <Check className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                        Address verified and enriched with property data
                      </div>
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

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Property Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="propertyType">Property Type</Label>
                    <Select 
                      value={formData.propertyType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, propertyType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single-family">Single Family Home</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                        <SelectItem value="condo">Condominium</SelectItem>
                        <SelectItem value="duplex">Duplex</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="yearBuilt">Year Built</Label>
                      <Input
                        id="yearBuilt"
                        type="number"
                        value={formData.yearBuilt}
                        onChange={(e) => setFormData(prev => ({ ...prev, yearBuilt: e.target.value }))}
                        min="1800"
                        max={new Date().getFullYear()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="squareFeet">Square Feet</Label>
                      <Input
                        id="squareFeet"
                        type="number"
                        value={formData.squareFeet}
                        onChange={(e) => setFormData(prev => ({ ...prev, squareFeet: e.target.value }))}
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        step="0.5"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

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