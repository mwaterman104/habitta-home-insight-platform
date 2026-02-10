import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useChatContext } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAttomProperty } from '@/hooks/useAttomProperty';
import { SimpleRefreshButton } from '@/components/SimpleRefreshButton';
import { DashboardV3Layout } from '@/layouts/DashboardV3Layout';
import { useQuery } from '@tanstack/react-query';

// Home Profile Components
import { HomeProfileContextHeader, HomeHealthStatus } from '@/components/HomeProfile/HomeProfileContextHeader';
import { PropertyHero } from '@/components/HomeProfile/PropertyHero';
import { KeyMetrics } from '@/components/HomeProfile/KeyMetrics';
import { HomeStructure } from '@/components/HomeProfile/HomeStructure';
import { SystemProvenance } from '@/components/HomeProfile/SystemProvenance';
import { PermitsHistory } from '@/components/HomeProfile/PermitsHistory';
import { SupportingRecords } from '@/components/HomeProfile/SupportingRecords';
import { HomeActivityLog } from '@/components/HomeProfile/HomeActivityLog';
import { PurchaseContext } from '@/components/HomeProfile/PurchaseContext';

// Hooks
import { useHomeIntelligence } from '@/hooks/useHomeIntelligence';
import { useSystemsData } from '@/hooks/useSystemsData';

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
  lat?: number;
  lng?: number;
}

/**
 * HomeActivityLogWithData - Queries home_events and maps to ActivityItem format.
 * Read-only. Honest empty state when no events exist.
 */
function HomeActivityLogWithData({ homeId, onLogActivity }: { homeId: string; onLogActivity?: () => void }) {
  const { data: homeEvents } = useQuery({
    queryKey: ['home-activity-events', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_events')
        .select('id, event_type, title, description, metadata, created_at')
        .eq('home_id', homeId)
        .in('event_type', [
          'system_discovered', 'issue_reported', 'repair_completed',
          'maintenance_performed', 'replacement', 'status_change'
        ])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!homeId,
  });

  const mappedActivities = (homeEvents || []).map((event) => {
    const meta = (event.metadata as Record<string, any>) || {};
    const category = meta.system_type || meta.kind || meta.category || 'Home';
    return {
      id: event.id,
      date: event.created_at,
      title: event.title,
      category,
      notes: event.description || undefined,
      contractor: meta.contractor || undefined,
    };
  });

  return <HomeActivityLog activities={mappedActivities} onLogActivity={onLogActivity} />;
}

/** Wrapper components that use useChatContext inside the DashboardV3Layout provider */
function SystemProvenanceWithChat({ systems, yearBuilt }: { systems: any[]; yearBuilt: number | null }) {
  const { openChat } = useChatContext();
  return (
    <SystemProvenance 
      systems={systems} 
      yearBuilt={yearBuilt}
      onEditSystem={(systemId) => openChat({ type: 'system_edit', systemKey: systemId, trigger: 'edit_confidence' })}
    />
  );
}

function SupportingRecordsWithChat() {
  const { openChat } = useChatContext();
  return <SupportingRecords documents={[]} onUploadRecord={() => openChat({ type: 'supporting_record', trigger: 'upload' })} />;
}

function HomeActivityLogWithChat({ homeId }: { homeId: string }) {
  const { openChat } = useChatContext();
  return <HomeActivityLogWithData homeId={homeId} onLogActivity={() => openChat({ type: 'activity_log', trigger: 'log_activity' })} />;
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

  // Get systems data - must be called before any conditional returns
  const { systems: systemsData, loading: systemsLoading } = useSystemsData(home?.id || '');

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

  // Determine home health status (simplified - could be enhanced with real logic)
  const getHomeHealthStatus = (): HomeHealthStatus => {
    // This would be derived from actual system health data
    return 'healthy';
  };

  return (
    <DashboardV3Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Context Header - Critical framing */}
          <HomeProfileContextHeader status={getHomeHealthStatus()} />

          {/* Property Hero with "Used in forecasting" badge */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <PropertyHero
                address={home.address}
                city={home.city}
                state={home.state}
                zipCode={home.zip_code}
              />
              {/* "Used in forecasting" badge */}
              <Badge variant="secondary" className="text-meta">
                Used in forecasting
              </Badge>
            </div>
            <SimpleRefreshButton
              onRefresh={refetchAttomData}
              loading={attomLoading}
              className="ml-4 mt-2"
            />
          </div>

          {/* Key Metrics - use Attom data when available */}
          <KeyMetrics
            squareFeet={attomData?.propertyDetails?.sqft || home.square_feet}
            bedrooms={attomData?.propertyDetails?.bedrooms || home.bedrooms}
            bathrooms={attomData?.propertyDetails?.bathrooms || home.bathrooms}
            yearBuilt={attomData?.propertyDetails?.yearBuilt || home.year_built}
          />

          {/* Home Structure & Materials - 2-column grouped layout */}
          <HomeStructure
            propertyData={attomData || undefined}
            propertyType={home.property_type}
            city={home.city}
            state={home.state}
            lat={home.lat}
          />

          {/* System Sources & Confidence - The trust engine */}
          <SystemProvenanceWithChat systems={systemsData} yearBuilt={home.year_built} />

          {/* Permits & Construction History */}
          <PermitsHistory
            homeId={home.id}
            address={fullAddress}
          />

          {/* Supporting Records - Empty state, no mock data */}
          <SupportingRecordsWithChat />

          {/* Home Activity Log - Wired to real home_events data */}
          <HomeActivityLogWithChat homeId={home.id} />
        </div>
      </div>
    </DashboardV3Layout>
  );
};

export default HomeProfilePage;