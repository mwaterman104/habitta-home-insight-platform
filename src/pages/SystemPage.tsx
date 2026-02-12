import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SystemDetailView } from "@/components/SystemDetailView";
import { ApplianceDetailView } from "@/components/system/ApplianceDetailView";
import { AssetDetailView } from "@/components/system/AssetDetailView";
import type { SystemPrediction } from "@/types/systemPrediction";
import { useToast } from "@/hooks/use-toast";
import { isValidSystemKey } from "@/lib/systemMeta";
import { DashboardV3Layout } from "@/layouts/DashboardV3Layout";

interface UserHome {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_id?: string;
  year_built?: number;
}

/**
 * SystemPage - Route-based system detail view
 * 
 * Accessed via /system/:systemKey or /systems/:systemSlug
 * Deep-linkable, refreshable, shareable.
 * 
 * Supports: 
 * - Structural systems: hvac, roof, water_heater (by key)
 * - Appliances: by UUID (detected by length and format)
 * 
 * All structural systems follow HVAC canonical template.
 * Appliances render via ApplianceDetailView.
 */
export default function SystemPage() {
  // Support both param names for backward compatibility
  const params = useParams<{ systemKey?: string; systemSlug?: string }>();
  const systemKey = params.systemKey || params.systemSlug;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if this is an appliance UUID vs a system key
  // UUIDs are 36 chars with dashes (e.g., "550e8400-e29b-41d4-a716-446655440000")
  const isApplianceId = systemKey?.length === 36 && systemKey.includes('-');
  
  const [loading, setLoading] = useState(true);
  const [userHome, setUserHome] = useState<UserHome | null>(null);
  const [prediction, setPrediction] = useState<SystemPrediction | null>(null);
  
  // Fetch appliance data if UUID
  const { data: applianceData, isLoading: isApplianceLoading } = useQuery({
    queryKey: ['appliance-detail', systemKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_systems')
        .select('*')
        .eq('id', systemKey!)
        .single();
      if (error) throw error;
      
      // Fetch catalog separately since there's no FK
      const baseKey = data.system_key?.split('_').slice(0, 2).join('_') || '';
      const { data: catalog } = await supabase
        .from('system_catalog')
        .select('key, display_name, typical_lifespan_years, appliance_tier, maintenance_checks')
        .or(`key.eq.${baseKey},key.eq.${data.system_key?.split('_')[0]}`)
        .limit(1)
        .maybeSingle();
      
      return { ...data, system_catalog: catalog };
    },
    enabled: !!isApplianceId && !!systemKey,
    retry: false,
  });

  // Fallback: if UUID not found in home_systems, try home_assets
  const { data: assetData, isLoading: isAssetLoading } = useQuery({
    queryKey: ['asset-detail', systemKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_assets')
        .select('id, kind, category, manufacturer, model, confidence, source, status, install_date, created_at')
        .eq('id', systemKey!)
        .single();
      if (error) throw error;
      return data;
    },
    // Only run if appliance query finished and returned nothing
    enabled: !!isApplianceId && !!systemKey && !isApplianceLoading && !applianceData,
  });

  // Fetch user home first
  useEffect(() => {
    if (!user) return;

    const fetchUserHome = async () => {
      try {
        const { data, error } = await supabase
          .from('homes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setUserHome(data);
      } catch (error) {
        console.error('Error fetching user home:', error);
      }
    };

    fetchUserHome();
  }, [user]);

  // Fetch system prediction when home is available (only for structural systems)
  useEffect(() => {
    // Skip if this is an appliance (handled by react-query above)
    if (isApplianceId) {
      setLoading(false);
      return;
    }
    
    if (!userHome?.id || !systemKey) return;

    const fetchPrediction = async () => {
      setLoading(true);
      try {
        // Validate system key
        if (!isValidSystemKey(systemKey)) {
          toast({
            title: 'System not available',
            description: 'This system is not yet supported.',
            variant: 'destructive',
          });
          navigate('/systems');
          return;
        }

        // Use unified system-prediction action
        const { data, error } = await supabase.functions.invoke('intelligence-engine', {
          body: { 
            action: 'system-prediction',
            systemKey: systemKey,
            property_id: userHome.id 
          }
        });

        if (error) throw error;
        if (data) {
          setPrediction(data);
        }
      } catch (error) {
        console.error('Error fetching system prediction:', error);
        toast({
          title: 'Unable to load system data',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [userHome?.id, systemKey, isApplianceId, navigate, toast]);

  // Handle back navigation - goes to Systems Hub
  const handleBack = () => {
    navigate('/systems');
  };

  // Handle action completion - refresh prediction with softened feedback
  const handleActionComplete = async (actionSlug: string) => {
    if (!userHome?.id || !systemKey || !isValidSystemKey(systemKey)) return;

    try {
      const { data, error } = await supabase.functions.invoke('intelligence-engine', {
        body: { 
          action: 'system-prediction',
          systemKey: systemKey,
          property_id: userHome.id,
          forceRefresh: true
        }
      });

      if (error) throw error;
      if (data) {
        setPrediction(data);
        
        // Softened feedback language - avoid over-promising improvement
        const feedbackMessage = systemKey === 'hvac'
          ? 'Your HVAC outlook has been updated.'
          : 'Your system history has been updated. Future forecasts will reflect this.';
        
        toast({
          title: 'Maintenance logged',
          description: feedbackMessage,
        });
      }
    } catch (error) {
      console.error('Error refreshing prediction:', error);
    }
  };

  // Handle appliance deletion
  const handleDeleteAppliance = async (id: string) => {
    const { error } = await supabase
      .from('home_systems')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({
        title: 'Failed to remove',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
    
    // Invalidate queries to refresh lists
    queryClient.invalidateQueries({ queryKey: ['home-systems'] });
    
    toast({
      title: 'Removed',
      description: 'This appliance is no longer being tracked.',
    });
  };

  // If this is a UUID-based item (appliance or discovered asset)
  if (isApplianceId) {
    if (isApplianceLoading || isAssetLoading) {
      return (
        <DashboardV3Layout>
          <div className="p-6 space-y-6 max-w-3xl mx-auto animate-pulse">
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </DashboardV3Layout>
      );
    }

    // Render appliance detail if found in home_systems
    if (applianceData) {
      return (
        <DashboardV3Layout>
          <ApplianceDetailView 
            appliance={applianceData} 
            onBack={handleBack}
            onDelete={handleDeleteAppliance}
          />
        </DashboardV3Layout>
      );
    }

    // Render discovered asset detail if found in home_assets
    if (assetData) {
      return (
        <DashboardV3Layout>
          <AssetDetailView 
            asset={assetData} 
            onBack={handleBack}
          />
        </DashboardV3Layout>
      );
    }

    // Neither found
    return (
      <DashboardV3Layout>
        <div className="p-6 max-w-3xl mx-auto">
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">Item not found</p>
            <p className="text-sm">This item may have been removed.</p>
          </div>
        </div>
      </DashboardV3Layout>
    );
  }

  // Structural system loading state
  if (loading) {
    return (
      <DashboardV3Layout>
        <div className="p-6 space-y-6 max-w-3xl mx-auto animate-pulse">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </DashboardV3Layout>
    );
  }

  if (!prediction) {
    return (
      <DashboardV3Layout>
        <div className="p-6 max-w-3xl mx-auto">
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">No data available for this system</p>
            <p className="text-sm">We're still analyzing your home.</p>
          </div>
        </div>
      </DashboardV3Layout>
    );
  }

  return (
    <DashboardV3Layout>
      <div className="p-6 max-w-3xl mx-auto pb-24 md:pb-6">
        <SystemDetailView 
          prediction={prediction}
          homeId={userHome?.id}
          yearBuilt={userHome?.year_built}
          onBack={handleBack}
          onActionComplete={handleActionComplete}
          onSystemUpdated={async () => {
            // Refetch prediction after system update
            if (!userHome?.id || !systemKey || !isValidSystemKey(systemKey)) return;
            
            try {
              const { data, error } = await supabase.functions.invoke('intelligence-engine', {
                body: { 
                  action: 'system-prediction',
                  systemKey: systemKey,
                  property_id: userHome.id,
                  forceRefresh: true
                }
              });
              if (!error && data) {
                setPrediction(data);
              }
            } catch (error) {
              console.error('Error refreshing prediction:', error);
            }
          }}
        />
      </div>
    </DashboardV3Layout>
  );
}
