import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SystemDetailView } from "@/components/SystemDetailView";
import type { SystemPrediction } from "@/types/systemPrediction";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_SYSTEMS, SYSTEM_META, isValidSystemKey, getSystemLabel } from "@/lib/systemMeta";

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
 * Accessed via /system/:systemKey
 * Deep-linkable, refreshable, shareable.
 * 
 * Supports: hvac, roof, water_heater
 * All systems follow HVAC canonical template.
 */
export default function SystemPage() {
  const { systemKey } = useParams<{ systemKey: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [userHome, setUserHome] = useState<UserHome | null>(null);
  const [prediction, setPrediction] = useState<SystemPrediction | null>(null);

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

  // Fetch system prediction when home is available
  useEffect(() => {
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
          navigate('/dashboard');
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
  }, [userHome?.id, systemKey, navigate, toast]);

  // Handle back navigation - always goes to Home Pulse
  const handleBack = () => {
    navigate('/dashboard');
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

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl mx-auto animate-pulse">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No data available for this system</p>
          <p className="text-sm">We're still analyzing your home.</p>
        </div>
      </div>
    );
  }

  return (
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
  );
}
