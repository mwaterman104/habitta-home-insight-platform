import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
import { useUpcomingTasks } from "@/hooks/useUpcomingTasks";
import { useSmartyPropertyData } from "@/hooks/useSmartyPropertyData";
import { useCapitalTimeline } from "@/hooks/useCapitalTimeline";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdvisorState } from "@/hooks/useAdvisorState";
import { useInvalidateRiskDeltas } from "@/hooks/useRiskDeltas";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { RiskLevel } from "@/types/advisorState";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Dashboard V3 Components
import { TopHeader } from "@/components/dashboard-v3/TopHeader";
import { LeftColumn } from "@/components/dashboard-v3/LeftColumn";
import { MiddleColumn } from "@/components/dashboard-v3/MiddleColumn";
import { RightColumn } from "@/components/dashboard-v3/RightColumn";
// ChatDock is now rendered inside MiddleColumn, not here

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
  year_built?: number;
}

/**
 * DashboardV3 - Three-Column Intelligent Home Platform
 * 
 * Architecture: Data-first, Agent-latent
 * - Left Column: Navigation + Property Identity
 * - Middle Column: Primary Canvas (Forecast → Timeline → Tasks → ChatDock)
 * - Right Column: "Am I okay?" Performance at a Glance
 * 
 * Advisor State Model:
 * PASSIVE → OBSERVING → ENGAGED → DECISION → EXECUTION
 * Chat auto-opens only on specific triggers (system selection, risk threshold, etc.)
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

// Note: rightPanelSize tracking removed - ChatDock is now in-flow inside MiddleColumn

  // Advisor state machine
  const {
    advisorState,
    focusContext,
    confidence,
    risk,
    shouldChatBeOpen,
    openingMessage,
    hasAgentMessage,
    selectSystem,
    handleRiskThresholdCrossed,
    handleConfidenceImproved,
    handlePlanningWindowEntered,
    handleUserReply,
    handleChatDismissed,
    handleChatExpanded,
  } = useAdvisorState({
    initialConfidence: userHome?.confidence ?? 0.5,
    initialRisk: 'LOW',
  });

  // Fetch maintenance tasks
  const { data: maintenanceTasks, loading: tasksLoading, refetch: refetchTasks } = useUpcomingTasks(userHome?.id, 365);

  // Property valuation is fetched once here and passed down.
  // Do not call useSmartyPropertyData in child components.
  const { data: propertyData, loading: propertyLoading } = useSmartyPropertyData();

  // Fetch capital timeline
  const { timeline: capitalTimeline, loading: timelineLoading } = useCapitalTimeline({ 
    homeId: userHome?.id, 
    enabled: !!userHome?.id 
  });

  // Risk delta invalidation
  const invalidateRiskDeltas = useInvalidateRiskDeltas();
  const queryClient = useQueryClient();

  // Fetch user home - extracted as callback for reuse
  const fetchUserHome = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  // Initial fetch on mount
  useEffect(() => {
    fetchUserHome();
  }, [fetchUserHome]);

  // Backfill coordinates if missing (fire-and-forget, silent failure)
  useEffect(() => {
    if (!userHome?.id) return;
    if (userHome.latitude != null && userHome.longitude != null) return; // Already has coords

    console.log('[DashboardV3] Triggering coordinate backfill for home:', userHome.id);
    
    supabase.functions.invoke('backfill-home-coordinates', {
      body: { home_id: userHome.id }
    }).then(({ data, error }) => {
      if (error) {
        console.error('[DashboardV3] Coordinate backfill failed:', error);
        return;
      }
      if (data?.status === 'success' && data?.geo) {
        console.log('[DashboardV3] Coordinates backfilled, refreshing home data');
        fetchUserHome();
      }
    }).catch((err) => {
      console.error('[DashboardV3] Coordinate backfill error:', err);
      // Silent failure - map shows fallback, no error banner
    });
  }, [userHome?.id, userHome?.latitude, userHome?.longitude, fetchUserHome]);

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

        if (hvacRes.data) {
          setHvacPrediction(hvacRes.data);
          
          // Check for risk threshold or planning window triggers
          const status = hvacRes.data.status as 'low' | 'moderate' | 'high';
          if (status === 'high') {
            handleRiskThresholdCrossed('hvac', 'HIGH');
          } else if (status === 'moderate') {
            // Check if entering planning window (< 36 months)
            const remainingYears = hvacRes.data.forecast?.remainingYears;
            if (remainingYears && remainingYears < 3) {
              handlePlanningWindowEntered('hvac', remainingYears * 12);
            }
          }
          
          // Check for confidence improvement
          const newConfidence = hvacRes.data.confidence ?? 0.5;
          if (newConfidence > confidence + 0.15) {
            handleConfidenceImproved('hvac', confidence, newConfidence);
          }
        }
        
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

  // Navigate to system detail AND trigger advisor state
  const handleSystemClick = (systemKey: string) => {
    selectSystem(systemKey);
    navigate(`/system/${systemKey}`);
  };

  // Handle system click without navigation (just focus)
  const handleSystemFocus = (systemKey: string) => {
    selectSystem(systemKey);
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

  // Handle chat expansion changes
  const handleChatExpandChange = (expanded: boolean) => {
    if (expanded) {
      handleChatExpanded();
    } else {
      handleChatDismissed();
    }
  };

  // Handle task completion with risk delta capture
  const handleTaskComplete = useCallback(async (taskId: string) => {
    if (!userHome?.id) return;
    
    try {
      // Update task status in database
      const { error } = await supabase
        .from('habitta_maintenance_tasks')
        .update({ 
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
      
      // Show success toast
      toast.success("Task completed", {
        description: "Your home health score will update shortly.",
      });
      
      // Refetch tasks to update UI
      refetchTasks();
      
      // Trigger prediction refresh (will calculate delta)
      await supabase.functions.invoke('intelligence-engine', {
        body: { action: 'refresh-after-maintenance', home_id: userHome.id, task_id: taskId }
      });
      
      // Invalidate caches
      invalidateRiskDeltas(userHome.id);
      queryClient.invalidateQueries({ queryKey: ['home-forecast'] });
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error("Failed to complete task", {
        description: "Please try again.",
      });
    }
  }, [userHome?.id, refetchTasks, invalidateRiskDeltas, queryClient]);

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
            <CardTitle className="text-2xl">Welcome to Habitta</CardTitle>
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

  // Mobile: Single column layout
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
            chatExpanded={shouldChatBeOpen}
            onChatExpandChange={handleChatExpandChange}
            hasAgentMessage={hasAgentMessage}
            propertyId={userHome.id}
            onSystemClick={handleSystemFocus}
            isEnriching={isEnriching}
            isMobile={true}
            advisorState={advisorState}
            focusContext={focusContext.type === 'SYSTEM' ? { systemKey: focusContext.systemKey, trigger: 'user' } : undefined}
            openingMessage={openingMessage}
            confidence={confidence}
            risk={risk}
            onUserReply={handleUserReply}
            onTaskComplete={handleTaskComplete}
            marketValue={propertyData?.currentValue ?? null}
            mortgageBalance={propertyData?.estimatedMortgageBalance ?? null}
            mortgageConfidence={propertyData?.estimatedMortgageBalance ? 'inferred' : null}
            city={userHome?.city ?? null}
            state={userHome?.state ?? null}
          />
        </main>
      </div>
    );
  }

  // Desktop: Full 3-column layout
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <TopHeader 
        address={fullAddress}
        healthStatus={getHealthStatus()}
        onAddressClick={handleAddressClick}
      />
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Column - Navigation + Identity (Fixed 240px) */}
        <aside className="w-60 border-r bg-card shrink-0 hidden lg:flex flex-col">
          <LeftColumn 
            address={fullAddress}
            onAddressClick={handleAddressClick}
          />
        </aside>
        
        {/* Resizable Middle + Right Columns (xl screens) */}
        <ResizablePanelGroup 
          direction="horizontal" 
          className="flex-1 min-h-0 hidden xl:flex"
          onLayout={(sizes) => {
            localStorage.setItem('dashboard_right_panel_size', sizes[1].toString());
          }}
        >
          {/* Middle Column - Primary Canvas */}
          <ResizablePanel 
            defaultSize={60} 
            minSize={55}
            className="!overflow-hidden"
          >
            <div className="h-full p-6 pb-0">
              <MiddleColumn
                homeForecast={homeForecast}
                forecastLoading={forecastLoading}
                hvacPrediction={hvacPrediction}
                hvacLoading={hvacLoading}
                capitalTimeline={capitalTimeline}
                timelineLoading={timelineLoading}
                maintenanceData={maintenanceTimelineData}
                chatExpanded={shouldChatBeOpen}
                onChatExpandChange={handleChatExpandChange}
                hasAgentMessage={hasAgentMessage}
                propertyId={userHome.id}
                onSystemClick={handleSystemFocus}
                isEnriching={isEnriching}
                advisorState={advisorState}
                focusContext={focusContext.type === 'SYSTEM' ? { systemKey: focusContext.systemKey, trigger: 'user' } : undefined}
                openingMessage={openingMessage}
                confidence={confidence}
                risk={risk}
              onUserReply={handleUserReply}
              onTaskComplete={handleTaskComplete}
              marketValue={propertyData?.currentValue ?? null}
              mortgageBalance={propertyData?.estimatedMortgageBalance ?? null}
              mortgageConfidence={propertyData?.estimatedMortgageBalance ? 'inferred' : null}
              city={userHome?.city ?? null}
              state={userHome?.state ?? null}
            />
            </div>
          </ResizablePanel>
          
          {/* Drag Handle */}
          <ResizableHandle withHandle />
          
          {/* Right Column - Context Rail (40% default) */}
          <ResizablePanel 
            defaultSize={parseFloat(localStorage.getItem('dashboard_right_panel_size') || '40')} 
            minSize={30} 
            maxSize={45}
          >
            <aside className="border-l bg-muted/10 h-full overflow-y-auto p-6">
              <RightColumn
                loading={forecastLoading || hvacLoading || timelineLoading}
                latitude={userHome.latitude}
                longitude={userHome.longitude}
                address={userHome.address}
                city={userHome.city}
                state={userHome.state}
              />
            </aside>
          </ResizablePanel>
        </ResizablePanelGroup>
        
        {/* Middle Column only (lg screens without right column) */}
        <div className="flex-1 min-h-0 flex-col p-6 pb-0 hidden lg:flex xl:hidden">
          <MiddleColumn
            homeForecast={homeForecast}
            forecastLoading={forecastLoading}
            hvacPrediction={hvacPrediction}
            hvacLoading={hvacLoading}
            capitalTimeline={capitalTimeline}
            timelineLoading={timelineLoading}
            maintenanceData={maintenanceTimelineData}
            chatExpanded={shouldChatBeOpen}
            onChatExpandChange={handleChatExpandChange}
            hasAgentMessage={hasAgentMessage}
            propertyId={userHome.id}
            onSystemClick={handleSystemFocus}
            isEnriching={isEnriching}
            isMobile={true}
            advisorState={advisorState}
            focusContext={focusContext.type === 'SYSTEM' ? { systemKey: focusContext.systemKey, trigger: 'user' } : undefined}
            openingMessage={openingMessage}
            confidence={confidence}
            risk={risk}
            onUserReply={handleUserReply}
            onTaskComplete={handleTaskComplete}
            marketValue={propertyData?.currentValue ?? null}
            mortgageBalance={propertyData?.estimatedMortgageBalance ?? null}
            mortgageConfidence={propertyData?.estimatedMortgageBalance ? 'inferred' : null}
            city={userHome?.city ?? null}
            state={userHome?.state ?? null}
          />
        </div>
      </div>
    </div>
  );
}
