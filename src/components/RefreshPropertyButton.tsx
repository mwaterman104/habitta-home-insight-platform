import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { smartyEnrich } from '@/lib/smarty';
import { mapEnrichment } from '@/adapters/smartyMappers';

interface RefreshPropertyButtonProps {
  homeId: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  onRefresh?: () => void;
}

export function RefreshPropertyButton({ 
  homeId, 
  address, 
  city, 
  state, 
  zipCode, 
  onRefresh 
}: RefreshPropertyButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Get the address_id from the home
      const { data: homeData, error: homeError } = await supabase
        .from('homes')
        .select('address_id')
        .eq('id', homeId)
        .single();

      if (homeError || !homeData?.address_id) {
        throw new Error('Could not find address for this home');
      }

      // Call Smarty enrichment API
      const enrichData = await smartyEnrich({
        street: address,
        city: city,
        state: state,
        postal_code: zipCode
      });

      const enrichment = mapEnrichment(enrichData);

      // Update the property_enrichment record
      const { error: enrichError } = await supabase
        .from('property_enrichment')
        .upsert({
          address_id: homeData.address_id,
          attributes: enrichment.attributes,
          raw: enrichment.raw,
          refreshed_at: new Date().toISOString()
        });

      if (enrichError) throw enrichError;

      // Update the home record with new enriched data
      const { error: updateError } = await supabase
        .from('homes')
        .update({
          year_built: enrichment.attributes.year_built,
          square_feet: enrichment.attributes.square_feet,
          bedrooms: enrichment.attributes.beds,
          bathrooms: enrichment.attributes.baths,
          property_type: enrichment.attributes.property_type || undefined
        })
        .eq('id', homeId);

      if (updateError) throw updateError;

      toast({
        title: "Property Data Refreshed",
        description: "Your property information has been updated with the latest data.",
      });

      // Call refresh callback if provided
      if (onRefresh) {
        onRefresh();
      }

    } catch (error: any) {
      console.error('Error refreshing property data:', error);
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh property data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Property Data'}
    </Button>
  );
}