import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingTasks } from "@/hooks/useUpcomingTasks";
import { useCapitalTimeline } from "@/hooks/useCapitalTimeline";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";

// Dashboard V3 Components
import { TopHeader } from "@/components/dashboard-v3/TopHeader";
import { LeftColumn } from "@/components/dashboard-v3/LeftColumn";
import { MiddleColumn } from "@/components/dashboard-v3/MiddleColumn";
import { RightColumn } from "@/components/dashboard-v3/RightColumn";

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
 * DashboardV3 - Three-Column Intelligent Home Platform
 * 
 * Architecture: Data-first, Agent-latent
 * - Left Column: Navigation + Property Identity
 * - Middle Column: Primary Canvas (Forecast → Timeline → Tasks → ChatDock)
 * - Right Column: "Am I okay?" Performance at a Glance
 * 
 * The agent inhabits the dashboard rather than sitting on top of it.
 */
export default function DashboardV3() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [loading, setLoading] = useState(true);
  const [userHome, setUserHome] = useState<UserHome | null>(null);
  
  // HVAC Prediction State
  const [hvacPrediction, setHvacPrediction] = useState<SystemPrediction | null>(null);
  const [hvacLoading, setHvacLoading] = useState(false);
  
  // Home Forecast State
  const [homeForecast, setHomeForecast] = useState<HomeForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  
  // Chat dock expansion state
  const [chatExpanded, setChatExpanded] = useState(false);
  const [hasAgentMessage, setHasAgentMessage] = useState(false);

  // Fetch maintenance tasks
  const { data: maintenanceTasks, loading: tasksLoading } = useUpcomingTasks(userHome?.id, 365);

  // Fetch capital timeline
  const { timeline: capitalTimeline, loading: timelineLoading } = useCapitalTimeline({ 
    homeId: userHome?.id, 
    enabled: !!userHome?.id 
  });

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
        if (data) setUserHome(data);
      } catch (error) {
        console.error('Error fetching user home:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserHome();
  }, [user]);

  // Fetch predictions when home is available
  useEffect(() => {
    if (!userHome?.id) return;

    const fetchPredictions = async () => {
      setHvacLoading(true);
      setForecastLoading(true);
      
      try {
        const [hvacRes, forecastRes] = await Promise.all([
          supabase.functions.invoke('intelligence-engine', {
            body: { action: 'hvac-prediction', property_id: userHome.id }
          }),
          supabase.functions.invoke('intelligence-engine', {
            body: { action: 'home-forecast', property_id: userHome.id }
          })
        ]);

        if (hvacRes.data) setHvacPrediction(hvacRes.data);
        if (forecastRes.data) setHomeForecast(forecastRes.data as HomeForecast);
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setHvacLoading(false);
        setForecastLoading(false);
      }
    };

    fetchPredictions();
  }, [userHome?.id]);

  // Build maintenance timeline data
  const maintenanceTimelineData = useMemo(() => {
    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(now.getMonth() + 3);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    
    if (maintenanceTasks && maintenanceTasks.length > 0) {
      const nowTasks = maintenanceTasks
        .filter(t => new Date(t.due_date) <= threeMonthsLater)
        .map(t => ({
          id: t.id,
          title: t.title,
          metaLine: t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
          completed: t.status === 'completed',
        }));
      
      const thisYearTasks = maintenanceTasks
        .filter(t => new Date(t.due_date) > threeMonthsLater && new Date(t.due_date) <= yearEnd)
        .map(t => ({
          id: t.id,
          title: t.title,
          metaLine: t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short' }) : undefined,
          completed: t.status === 'completed',
        }));
      
      const futureYearsTasks = maintenanceTasks
        .filter(t => new Date(t.due_date) > yearEnd)
        .map(t => ({
          id: t.id,
          title: t.title,
          metaLine: t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined,
          completed: t.status === 'completed',
        }));
      
      return { nowTasks, thisYearTasks, futureYearsTasks };
    }
    
    // Fallback from HVAC prediction
    const fallbackNow = hvacPrediction?.actions
      .filter(a => a.priority === 'high')
      .map((a, i) => ({ id: `now-${i}`, title: a.title, metaLine: a.metaLine, completed: false })) || [];

    const fallbackYear = hvacPrediction?.actions
      .filter(a => a.priority === 'standard')
      .map((a, i) => ({ id: `year-${i}`, title: a.title, metaLine: a.metaLine, completed: false })) || [];

    const fallbackFuture = hvacPrediction?.planning 
      ? [{ id: 'planning-1', title: 'Consider HVAC replacement planning', metaLine: '$6,000–$12,000', completed: false }] 
      : [];
      
    return { nowTasks: fallbackNow, thisYearTasks: fallbackYear, futureYearsTasks: fallbackFuture };
  }, [maintenanceTasks, hvacPrediction]);

  // Navigate to system detail
  const handleSystemClick = (systemKey: string) => {
    navigate(`/system/${systemKey}`);
  };

  // Navigate to home profile
  const handleAddressClick = () => {
    navigate('/home-profile');
  };

  // Derive health status for header
  const getHealthStatus = (): 'healthy' | 'attention' | 'critical' => {
    if (!hvacPrediction) return 'healthy';
    switch (hvacPrediction.status) {
      case 'low': return 'healthy';
      case 'moderate': return 'attention';
      case 'high': return 'critical';
      default: return 'healthy';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  // No home state
  if (!userHome) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md w-full rounded-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Home className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to Home Pulse</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              To get started with personalized insights, please add your home address.
            </p>
            <Button 
              onClick={() => navigate('/onboarding')} 
              className="w-full"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullAddress = `${userHome.address}, ${userHome.city}, ${userHome.state} ${userHome.zip_code}`;
  const isEnriching = userHome.pulse_status === 'enriching' || userHome.pulse_status === 'initializing';

  // Mobile: Single column layout (reuse existing HomePulsePage behavior)
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader 
          address={fullAddress}
          healthStatus={getHealthStatus()}
          onAddressClick={handleAddressClick}
        />
        <main className="p-4 pb-24">
          <MiddleColumn
            homeForecast={homeForecast}
            forecastLoading={forecastLoading}
            hvacPrediction={hvacPrediction}
            hvacLoading={hvacLoading}
            capitalTimeline={capitalTimeline}
            timelineLoading={timelineLoading}
            maintenanceData={maintenanceTimelineData}
            chatExpanded={chatExpanded}
            onChatExpandChange={setChatExpanded}
            hasAgentMessage={hasAgentMessage}
            propertyId={userHome.id}
            onSystemClick={handleSystemClick}
            isEnriching={isEnriching}
            isMobile={true}
          />
        </main>
      </div>
    );
  }

  // Desktop: Full 3-column layout
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopHeader 
        address={fullAddress}
        healthStatus={getHealthStatus()}
        onAddressClick={handleAddressClick}
      />
      
      <div className="flex flex-1 h-[calc(100vh-64px)]">
        {/* Left Column - Navigation + Identity (Fixed 240px) */}
        <aside className="w-60 border-r bg-card shrink-0 hidden lg:block overflow-y-auto">
          <LeftColumn 
            address={fullAddress}
            onAddressClick={handleAddressClick}
          />
        </aside>
        
        {/* Middle Column - Primary Canvas (Flex) */}
        <main className="flex-1 overflow-y-auto p-6">
          <MiddleColumn
            homeForecast={homeForecast}
            forecastLoading={forecastLoading}
            hvacPrediction={hvacPrediction}
            hvacLoading={hvacLoading}
            capitalTimeline={capitalTimeline}
            timelineLoading={timelineLoading}
            maintenanceData={maintenanceTimelineData}
            chatExpanded={chatExpanded}
            onChatExpandChange={setChatExpanded}
            hasAgentMessage={hasAgentMessage}
            propertyId={userHome.id}
            onSystemClick={handleSystemClick}
            isEnriching={isEnriching}
          />
        </main>
        
        {/* Right Column - Performance at a Glance (Fixed 360px) */}
        <aside className="w-[360px] border-l bg-muted/30 shrink-0 hidden xl:block overflow-y-auto p-6">
          <RightColumn
            homeForecast={homeForecast}
            hvacPrediction={hvacPrediction}
            capitalTimeline={capitalTimeline}
            loading={forecastLoading || hvacLoading || timelineLoading}
          />
        </aside>
      </div>
    </div>
  );
}
