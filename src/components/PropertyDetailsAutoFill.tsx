import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { smartyEnrich } from '@/lib/smarty';
import { mapEnrichment } from '@/adapters/smartyMappers';

interface PropertyDetailsAutoFillProps {
  formData: {
    propertyType: string;
    yearBuilt: string;
    squareFeet: string;
    bedrooms: string;
    bathrooms: string;
  };
  setFormData: (updater: (prev: any) => any) => void;
  isAddressVerified: boolean;
  verifiedAddress?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'miss' | 'error';

export const PropertyDetailsAutoFill: React.FC<PropertyDetailsAutoFillProps> = ({
  formData,
  setFormData,
  isAddressVerified,
  verifiedAddress
}) => {
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [fetchedData, setFetchedData] = useState<any | null>(null);

  useEffect(() => {
    if (!isAddressVerified || !verifiedAddress) {
      setFetchStatus('idle');
      return;
    }

    const fetchPropertyDetails = async () => {
      const stepId = crypto.randomUUID().slice(0, 8);
      console.log(`[${stepId}] Fetching property details for verified address`);
      
      setFetchStatus('loading');
      
      try {
        const enrichResponse = await smartyEnrich({
          street: verifiedAddress.address,
          city: verifiedAddress.city,
          state: verifiedAddress.state,
          postal_code: verifiedAddress.zipCode
        });

        const enrichmentData = mapEnrichment(enrichResponse);
        console.log(`[${stepId}] Smarty enrichment successful:`, enrichmentData.attributes);
        setFetchedData(enrichmentData);
        setFetchStatus('success');
        
        // Auto-fill empty fields only
        setFormData((prev: any) => ({
          ...prev,
          propertyType: prev.propertyType || (enrichmentData.attributes?.property_type ? 
            mapPropertyType(enrichmentData.attributes.property_type) : ''),
          yearBuilt: prev.yearBuilt || (enrichmentData.attributes?.year_built?.toString() || ''),
          squareFeet: prev.squareFeet || (enrichmentData.attributes?.square_feet?.toString() || ''),
          bedrooms: prev.bedrooms || (enrichmentData.attributes?.beds?.toString() || ''),
          bathrooms: prev.bathrooms || (enrichmentData.attributes?.baths?.toString() || ''),
        }));
        
      } catch (error: any) {
        console.warn(`[${stepId}] Smarty enrichment failed (non-blocking):`, error);
        
        if (error.message?.includes('Enrichment failed')) {
          setFetchStatus('miss');
        } else {
          setFetchStatus('error');
        }
      }
    };

    fetchPropertyDetails();
  }, [isAddressVerified, verifiedAddress, setFormData]);

  // Map Smarty property types to our form values
  const mapPropertyType = (smartyType: string): string => {
    const type = smartyType?.toLowerCase() || '';
    if (type.includes('single') || type.includes('family') || type.includes('residential')) return 'single-family';
    if (type.includes('town') || type.includes('townhome')) return 'townhouse';
    if (type.includes('condo') || type.includes('condominium')) return 'condo';
    if (type.includes('duplex') || type.includes('multi')) return 'duplex';
    return 'other';
  };

  const renderFetchStatus = () => {
    if (!isAddressVerified) return null;

    switch (fetchStatus) {
      case 'loading':
        return (
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Auto-filling property details...
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center text-sm text-green-600 mb-4">
            <CheckCircle className="w-3 h-3 mr-1" />
            Property details auto-filled from Smarty enrichment
          </div>
        );
      case 'miss':
        return (
          <div className="flex items-center text-sm text-amber-600 mb-4">
            <AlertCircle className="w-3 h-3 mr-1" />
            Property details not available from Smarty
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <AlertCircle className="w-3 h-3 mr-1" />
            Could not fetch property details
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Property Details</h3>
        {fetchStatus === 'success' && (
          <Badge variant="outline" className="text-green-600">
            Auto-filled
          </Badge>
        )}
      </div>
      
      {renderFetchStatus()}
      
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
            placeholder="e.g. 1995"
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
            placeholder="e.g. 2500"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Select
            value={formData.bedrooms}
            onValueChange={(value) => setFormData(prev => ({ ...prev, bedrooms: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Beds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="6+">6+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Select
            value={formData.bathrooms}
            onValueChange={(value) => setFormData(prev => ({ ...prev, bathrooms: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Baths" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="1.5">1.5</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="2.5">2.5</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="3.5">3.5</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="4+">4+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};