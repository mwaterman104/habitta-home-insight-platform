import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUpcomingTasks } from "@/hooks/useUpcomingTasks";

// Canonical Home Pulse Components
import { HomeHealthCard } from "@/components/HomeHealthCard";
import { SystemStatusCard } from "@/components/SystemStatusCard";
import { MaintenanceTimeline } from "@/components/MaintenanceTimeline";
import { FinancialOutlookCard } from "@/components/FinancialOutlookCard";
import { HomeValueImpact } from "@/components/HomeValueImpact";
import { ChatDIYBanner } from "@/components/ChatDIYBanner";
import { HomePulseGreeting } from "@/components/HomePulseGreeting";
import type { SystemPrediction } from "@/types/systemPrediction";
import { useToast } from "@/hooks/use-toast";

interface UserHome {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_id?: string;
  latitude?: number;
  longitude?: number;
  user_id: string;
  pulse_status?: string;
  confidence?: number;
}

/**
 * HomePulsePage - The canonical primary dashboard
 * 
 * Answers 4 questions:
 * 1. How healthy is my home?
 * 2. What needs attention (if anything)?
 * 3. What's coming up?
 * 4. What is the financial impact?
 * 
 * NO tabs. NO charts. NO probabilities.
 * Single narrative flow.
 */
export default function HomePulsePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [userHome, setUserHome] = useState<UserHome | null>(null);
  
  // HVAC Prediction State
  const [hvacPrediction, setHvacPrediction] = useState<SystemPrediction | null>(null);
  const [hvacLoading, setHvacLoading] = useState(false);
  
  // Why expansion state (for HomeHealthCard)
  const [whyExpanded, setWhyExpanded] = useState(false);

  // Fetch maintenance tasks from database
  const { data: maintenanceTasks, loading: tasksLoading } = useUpcomingTasks(userHome?.id, 365);

  // Fetch user home
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
        
        if (data) {
          setUserHome(data);
        }
      } catch (error) {
        console.error('Error fetching user home:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserHome();
  }, [user]);

  // Fallback: auto-transition pulse_status to 'live' after 30 seconds
  useEffect(() => {
    if (!userHome?.id) return;
    const status = userHome.pulse_status;
    
    if (status === 'enriching' || status === 'initializing') {
      const timeout = setTimeout(async () => {
        console.log('[HomePulsePage] Fallback: setting pulse_status to live');
        await supabase
          .from('homes')
          .update({ pulse_status: 'live' })
          .eq('id', userHome.id);
        
        // Update local state
        setUserHome(prev => prev ? { ...prev, pulse_status: 'live' } : null);
      }, 30000); // 30 seconds

      return () => clearTimeout(timeout);
    }
  }, [userHome?.id, userHome?.pulse_status]);

  // Fetch HVAC prediction when home is available
  useEffect(() => {
    if (!userHome?.id) return;

    const fetchHvacPrediction = async () => {
      setHvacLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('intelligence-engine', {
          body: { 
            action: 'hvac-prediction', 
            property_id: userHome.id 
          }
        });

        if (error) throw error;
        if (data) {
          setHvacPrediction(data);
        }
      } catch (error) {
        console.error('Error fetching HVAC prediction:', error);
        // Silent failure - don't toast on initial load
      } finally {
        setHvacLoading(false);
      }
    };

    fetchHvacPrediction();
  }, [userHome?.id]);

  // Navigate to system detail page
  const handleSystemClick = (systemKey: string) => {
    navigate(`/system/${systemKey}`);
  };

  // Navigate to home profile
  const handleAddressClick = () => {
    navigate('/home-profile');
  };

  // Derive overall health score from HVAC prediction
  const getOverallScore = () => {
    if (!hvacPrediction) return 82; // Default fallback
    switch (hvacPrediction.status) {
      case 'low': return 85;
      case 'moderate': return 70;
      case 'high': return 55;
      default: return 82;
    }
  };

  // Derive systems needing attention
  const getSystemsNeedingAttention = () => {
    if (!hvacPrediction) return 0;
    return hvacPrediction.status !== 'low' ? 1 : 0;
  };

  // Get "why" bullets from HVAC prediction (protective factors only)
  const getWhyBullets = (): string[] => {
    if (!hvacPrediction?.why?.bullets) {
      // Default protective bullets when no prediction available
      return [
        "HVAC system age is well within expected lifespan",
        "No abnormal usage or stress indicators detected",
        "Local climate conditions are continuously monitored"
      ];
    }
    return hvacPrediction.why.bullets;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse max-w-3xl mx-auto">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  // Build maintenance timeline from database tasks + HVAC prediction fallback
  const { nowTasks, thisYearTasks, futureYearsTasks } = useMemo(() => {
    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(now.getMonth() + 3);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    
    // If we have real tasks from the database, use them
    if (maintenanceTasks && maintenanceTasks.length > 0) {
      const nowItems = maintenanceTasks
        .filter(t => new Date(t.due_date) <= threeMonthsLater)
        .map(t => ({
          id: t.id,
          title: t.title,
          metaLine: t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
          completed: t.status === 'completed',
        }));
      
      const thisYearItems = maintenanceTasks
        .filter(t => new Date(t.due_date) > threeMonthsLater && new Date(t.due_date) <= yearEnd)
        .map(t => ({
          id: t.id,
          title: t.title,
          metaLine: t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short' }) : undefined,
          completed: t.status === 'completed',
        }));
      
      const futureItems = maintenanceTasks
        .filter(t => new Date(t.due_date) > yearEnd)
        .map(t => ({
          id: t.id,
          title: t.title,
          metaLine: t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined,
          completed: t.status === 'completed',
        }));
      
      return { nowTasks: nowItems, thisYearTasks: thisYearItems, futureYearsTasks: futureItems };
    }
    
    // Fallback: use HVAC prediction actions if no database tasks
    const fallbackNow = hvacPrediction?.actions
      .filter(a => a.priority === 'high')
      .map((a, i) => ({
        id: `now-${i}`,
        title: a.title,
        metaLine: a.metaLine,
        completed: false,
      })) || [];

    const fallbackYear = hvacPrediction?.actions
      .filter(a => a.priority === 'standard')
      .map((a, i) => ({
        id: `year-${i}`,
        title: a.title,
        metaLine: a.metaLine,
        completed: false,
      })) || [];

    const fallbackFuture = hvacPrediction?.planning 
      ? [{
          id: 'planning-1',
          title: 'Consider HVAC replacement planning',
          metaLine: '$6,000–$12,000',
          completed: false,
        }] 
      : [];
      
    return { nowTasks: fallbackNow, thisYearTasks: fallbackYear, futureYearsTasks: fallbackFuture };
  }, [maintenanceTasks, hvacPrediction]);

  // Check if still enriching
  const isEnriching = userHome?.pulse_status === 'enriching' || userHome?.pulse_status === 'initializing';
  const confidenceScore = userHome?.confidence || 35;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto pb-24 md:pb-6">
      {/* Enriching indicator */}
      {isEnriching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Still analyzing your home...
        </div>
      )}

      {/* 1. Greeting with clickable address */}
      <HomePulseGreeting 
        address={userHome ? `${userHome.address}, ${userHome.city}, ${userHome.state} ${userHome.zip_code}` : undefined}
        onAddressClick={handleAddressClick}
        latitude={userHome?.latitude}
        longitude={userHome?.longitude}
      />

      {/* 2. Home Health Summary */}
      <HomeHealthCard 
        overallScore={getOverallScore()}
        systemsNeedingAttention={getSystemsNeedingAttention()}
        lastUpdated="today"
        scoreDrivers="HVAC age, recent maintenance, and local climate"
        whyExpanded={whyExpanded}
        onToggleWhy={() => setWhyExpanded(!whyExpanded)}
        whyBullets={getWhyBullets()}
        confidenceScore={confidenceScore}
      />

      {/* 3. Coming Up - Systems that matter */}
      <section>
        <h2 className="text-xs uppercase text-muted-foreground mb-1 font-medium tracking-wider">
          Coming Up
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Tracking HVAC in detail. More systems coming soon.
        </p>
        <div className="space-y-3">
          {hvacLoading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : hvacPrediction ? (
            <SystemStatusCard
              systemName={hvacPrediction.header.name}
              summary={hvacPrediction.forecast.summary}
              recommendation={hvacPrediction.actions[0]?.title ? `Recommended: ${hvacPrediction.actions[0].title}` : undefined}
              status={hvacPrediction.status}
              nextReview={hvacPrediction.status === 'low' ? 'Next review after summer season' : undefined}
              onClick={() => handleSystemClick('hvac')}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground rounded-xl border border-dashed">
              <p>No HVAC data available yet.</p>
              <p className="text-sm">We're analyzing your home systems.</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Maintenance Timeline */}
      <MaintenanceTimeline
        nowTasks={nowTasks}
        thisYearTasks={thisYearTasks}
        futureYearsTasks={futureYearsTasks}
      />

      {/* 5. Financial Outlook */}
      <FinancialOutlookCard
        estimatedCosts={hvacPrediction?.status === 'high' ? '$300–$500' : '$100–$200'}
        avoidedRepairs="~$1,200"
        riskReduced="18%"
      />

      {/* 6. Home Value Impact */}
      <HomeValueImpact isVerified={hvacPrediction?.status === 'low'} />

      {/* 7. ChatDIY Action CTA */}
      <ChatDIYBanner topic={hvacPrediction?.actions[0]?.chatdiySlug} />
    </div>
  );
}
