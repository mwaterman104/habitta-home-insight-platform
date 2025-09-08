import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getPropertyHistory } from '@/lib/propertyAPI';
import type { PropertyHistory } from '@/lib/propertyAPI';

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
  const [fetchedData, setFetchedData] = useState<PropertyHistory | null>(null);

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
        const fullAddress = `${verifiedAddress.address}, ${verifiedAddress.city}, ${verifiedAddress.state} ${verifiedAddress.zipCode}`;
        const propertyData = await getPropertyHistory(fullAddress);
        
        console.log(`[${stepId}] Property data fetched successfully`);
        setFetchedData(propertyData);
        setFetchStatus('success');
        
        // Auto-fill empty fields only
        setFormData((prev: any) => ({
          ...prev,
          propertyType: prev.propertyType || (propertyData.propertyDetails?.propertyType ? 
            mapPropertyType(propertyData.propertyDetails.propertyType) : ''),
          yearBuilt: prev.yearBuilt || (propertyData.propertyDetails?.yearBuilt?.toString() || ''),
          squareFeet: prev.squareFeet || (propertyData.propertyDetails?.sqft?.toString() || ''),
          bedrooms: prev.bedrooms || (propertyData.propertyDetails?.bedrooms?.toString() || ''),
          bathrooms: prev.bathrooms || (propertyData.propertyDetails?.bathrooms?.toString() || ''),
        }));
        
      } catch (error: any) {
        console.warn(`[${stepId}] Property details fetch failed (non-blocking):`, error);
        
        if (error.message?.includes('Property API Error')) {
          setFetchStatus('miss');
        } else {
          setFetchStatus('error');
        }
      }
    };

    fetchPropertyDetails();
  }, [isAddressVerified, verifiedAddress, setFormData]);

  // Map ATTOM property types to our form values
  const mapPropertyType = (attomType: string): string => {
    const type = attomType?.toLowerCase() || '';
    if (type.includes('single') || type.includes('family') || type.includes('sfr')) return 'single-family';
    if (type.includes('town') || type.includes('townhome')) return 'townhouse';
    if (type.includes('condo') || type.includes('condominium')) return 'condo';
    if (type.includes('duplex')) return 'duplex';
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
            Property details auto-filled from public records
          </div>
        );
      case 'miss':
        return (
          <div className="flex items-center text-sm text-amber-600 mb-4">
            <AlertCircle className="w-3 h-3 mr-1" />
            Property details not found in public records
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