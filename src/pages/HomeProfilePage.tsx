import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAttomProperty } from '@/hooks/useAttomProperty';
import { SimpleRefreshButton } from '@/components/SimpleRefreshButton';

// Home Profile Components
import { PropertyHero } from '@/components/HomeProfile/PropertyHero';
import { KeyMetrics } from '@/components/HomeProfile/KeyMetrics';
import { PropertyDetails } from '@/components/HomeProfile/PropertyDetails';
import { HomeDocuments } from '@/components/HomeProfile/HomeDocuments';
import { PropertyHistory } from '@/components/HomeProfile/PropertyHistory';
import { PermitsHistory } from '@/components/HomeProfile/PermitsHistory';
import { SystemsOverview } from '@/components/SystemsOverview';

// Hooks
import { useHomeIntelligence } from '@/hooks/useHomeIntelligence';

// Mock data - only for non-system related data
import userProfileData from '../../client/mock/user_profile.json';
import maintenanceHistoryData from '../../client/mock/maintenance_history.json';

interface HomeData {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  year_built: number;
  square_feet: number;
  bedrooms: number;
  bathrooms: number;
  created_at: string;
}

const HomeProfilePage = () => {
  const { homeId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [home, setHome] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  // Get intelligence data for the home
  const { systems, validationInsights, loading: intelligenceLoading } = useHomeIntelligence();

  // Build full address for Attom API when home data is available
  const fullAddress = home 
    ? `${home.address}, ${home.city}, ${home.state} ${home.zip_code}`
    : '';

  const { data: attomData, loading: attomLoading, refetch: refetchAttomData } = useAttomProperty(fullAddress);

  useEffect(() => {
    if (!user) return;

    const fetchHome = async () => {
      setLoading(true);
      try {
        if (homeId) {
          const { data, error } = await supabase
            .from('homes')
            .select('*')
            .eq('id', homeId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;
          if (!data) throw new Error('Home not found');
          setHome(data);
        } else {
          // Fallback: load the first home for this user when no homeId is provided
          const { data, error } = await supabase
            .from('homes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            throw new Error('No homes found for this account');
          }
          setHome(data);
        }
      } catch (error: any) {
        toast({
          title: 'Error Loading Home',
          description: error.message,
          variant: 'destructive',
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, [user, homeId, navigate, toast]);

  if (loading || intelligenceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!home) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Home Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested home could not be found.</p>
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Property Hero */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <PropertyHero
                address={home.address}
                city={home.city}
                state={home.state}
                zipCode={home.zip_code}
                imageUrl={userProfileData.housePhotoUrl}
              />
            </div>
            <SimpleRefreshButton
              onRefresh={refetchAttomData}
              loading={attomLoading}
              className="ml-4 mt-2"
            />
          </div>

          {/* Key Metrics - use Attom data when available */}
          <KeyMetrics
            squareFeet={attomData?.propertyDetails?.sqft || home.square_feet || userProfileData.square_feet}
            bedrooms={attomData?.propertyDetails?.bedrooms || home.bedrooms || userProfileData.bedrooms}
            bathrooms={attomData?.propertyDetails?.bathrooms || home.bathrooms || userProfileData.bathrooms}
            yearBuilt={attomData?.propertyDetails?.yearBuilt || home.year_built}
          />

          {/* Property Details - pass Attom data */}
          <PropertyDetails
            propertyData={attomData || undefined}
            propertyType={home.property_type || userProfileData.property_type}
          />

          {/* Permits History - new section */}
          <PermitsHistory
            homeId={home.id}
            address={fullAddress}
          />

          {/* Systems Overview - Single source of truth from validation data */}
          <SystemsOverview systems={systems} insights={validationInsights} />

          {/* Home Documents */}
          <HomeDocuments />

          {/* Property History */}
          <PropertyHistory 
            history={maintenanceHistoryData.map(item => ({
              id: item.id,
              date: item.date,
              title: item.title,
              category: item.category,
              notes: item.notes
            }))}
          />
        </div>
      </main>
    </div>
  );
};

export default HomeProfilePage;