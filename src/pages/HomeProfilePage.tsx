import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Home Profile Components
import { PropertyHero } from '@/components/HomeProfile/PropertyHero';
import { KeyMetrics } from '@/components/HomeProfile/KeyMetrics';
import { PropertyDetails } from '@/components/HomeProfile/PropertyDetails';
import { SystemsAppliances } from '@/components/HomeProfile/SystemsAppliances';
import { HomeDocuments } from '@/components/HomeProfile/HomeDocuments';
import { PropertyHistory } from '@/components/HomeProfile/PropertyHistory';

// Mock data
import homeSystemsData from '../../client/mock/home_systems.json';
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

  useEffect(() => {
    if (!user || !homeId) return;

    const fetchHome = async () => {
      try {
        const { data, error } = await supabase
          .from('homes')
          .select('*')
          .eq('id', homeId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setHome(data);
      } catch (error: any) {
        toast({
          title: "Error Loading Home",
          description: error.message,
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, [user, homeId, navigate, toast]);

  if (loading) {
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
          <PropertyHero
            address={home.address}
            city={home.city}
            state={home.state}
            zipCode={home.zip_code}
            imageUrl={userProfileData.housePhotoUrl}
          />

          {/* Key Metrics */}
          <KeyMetrics
            squareFeet={home.square_feet || userProfileData.square_feet}
            bedrooms={home.bedrooms || userProfileData.bedrooms}
            bathrooms={home.bathrooms || userProfileData.bathrooms}
            yearBuilt={home.year_built}
          />

          {/* Property Details */}
          <PropertyDetails
            propertyType={home.property_type || userProfileData.property_type}
          />

          {/* Systems & Appliances */}
          <SystemsAppliances systems={homeSystemsData as any} />

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