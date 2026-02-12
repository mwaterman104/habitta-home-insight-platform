import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
import { useUpcomingTasks } from "@/hooks/useUpcomingTasks";
import { useSmartyPropertyData } from "@/hooks/useSmartyPropertyData";
import { useCapitalTimeline } from "@/hooks/useCapitalTimeline";
import { getLateLifeState } from "@/services/homeOutlook";
import { trackMobileEvent, MOBILE_EVENTS } from "@/lib/analytics/mobileEvents";
import { useHomeConfidence } from "@/hooks/useHomeConfidence";
import { getStrengthLevel } from "@/components/home-profile/HomeProfileRecordBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdvisorState } from "@/hooks/useAdvisorState";
import { useInvalidateRiskDeltas } from "@/hooks/useRiskDeltas";
import { useQueryClient } from "@tanstack/react-query";
import { useHomeSystems } from "@/hooks/useHomeSystems";
import { usePermitInsights } from "@/hooks/usePermitInsights";
import { useChatMode } from "@/hooks/useChatMode";
import { isFirstVisit, markFirstVisitComplete } from "@/lib/chatModeCopy";
import { toast } from "sonner";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { RiskLevel } from "@/types/advisorState";
import type { Recommendation } from "@/services/recommendationEngine";
import { RECOMMENDATION_CHAT_OPENERS } from "@/lib/mobileCopy";
import { getSystemDisplayName } from "@/lib/mobileCopy";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import BottomNavigation from "@/components/BottomNavigation";

// Dashboard V3 Components
import { TopHeader } from "@/components/dashboard-v3/TopHeader";
import { LeftColumn } from "@/components/dashboard-v3/LeftColumn";
import { MiddleColumn } from "@/components/dashboard-v3/MiddleColumn";
import { RightColumnSurface } from "@/components/dashboard-v3/RightColumnSurface";
import { FocusStateProvider, useFocusState } from "@/contexts/FocusStateContext";
import { MobileDashboardView } from "@/components/dashboard-v3/mobile";
import type { MobileChatIntent } from "@/components/dashboard-v3/mobile/MobileDashboardView";
import { MobileSystemDrawer } from "@/components/mobile";
import type { BaselineSystem } from "@/components/dashboard-v3/BaselineSurface";
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
  created_at?: string;
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
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // JavaScript-based xl breakpoint detection for deterministic conditional rendering
  const [isXlScreen, setIsXlScreen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1280;
  });
  
  useEffect(() => {
    const handleResize = () => {
      setIsXlScreen(window.innerWidth >= 1280);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [loading, setLoading] = useState(true);
  const [userHome, setUserHome] = useState<UserHome | null>(null);
  
  // Mobile chat intent (for navigation to /chat)
  const [mobileChatIntent, setMobileChatIntent] = useState<MobileChatIntent | null>(null);
  
  // Recommendation → chat orchestration
  const [activeRecommendation, setActiveRecommendation] = useState<Recommendation | null>(null);
  const [chatLockedForRecommendation, setChatLockedForRecommendation] = useState(false);
  
  // Mobile system drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // System filter state (badge toggle)
  const [systemFilter, setSystemFilter] = useState<'all' | 'attention'>('all');
  
  // Reset filter on navigation
  useEffect(() => {
    setSystemFilter('all');
  }, [location.pathname]);
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

  // Home Confidence computation
  const { 
    confidence: homeConfidence, 
    recommendations: homeRecommendations, 
    dismissRecommendation 
  } = useHomeConfidence(userHome?.id, capitalTimeline?.systems || [], userHome?.year_built);

  // Chat State Machine: Fetch home systems and permits for mode derivation
  const { systems: homeSystems, loading: systemsLoading, refetch: refetchSystems } = useHomeSystems(userHome?.id);
  const { insights: permitInsights, loading: permitsLoading } = usePermitInsights(userHome?.id);

  // Derive chat mode from system/permit data
  const chatModeContext = useChatMode({
    homeId: userHome?.id,
    systems: homeSystems,
    permitsFound: permitInsights.length > 0,
  });

  // System Update Contract: Callback for when systems are updated via photo analysis
  const handleSystemUpdated = useCallback(() => {
    refetchSystems();
    // Chat mode will recompute via useChatMode dependency on systems
  }, [refetchSystems]);

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

  // ============================================================
  // Mobile-specific derivations
  // NOTE: These are internal lifecycle states for data processing.
  // UI mapping to user-facing labels (Stable/Watch/Plan) happens
  // downstream in PrimarySystemCard and SecondarySystemsList.
  // ============================================================
  const baselineSystems: BaselineSystem[] = useMemo(() => {
    if (!capitalTimeline?.systems) return [];
    const currentYear = new Date().getFullYear();
    return capitalTimeline.systems.map(sys => {
      const likelyYear = sys.replacementWindow?.likelyYear;
      const remainingYears = likelyYear ? likelyYear - currentYear : undefined;
      
      // Internal state taxonomy (not UI labels)
      let state: 'stable' | 'planning_window' | 'elevated' | 'baseline_incomplete' = 'stable';
      if (sys.dataQuality === 'low') {
        state = 'baseline_incomplete';
      } else if (remainingYears !== undefined && remainingYears <= 1) {
        state = 'elevated';
      } else if (remainingYears !== undefined && remainingYears <= 3) {
        state = 'planning_window';
      }
      
      return {
        key: sys.systemId,
        displayName: sys.systemLabel,
        state,
        confidence: sys.dataQuality === 'high' ? 0.9 : sys.dataQuality === 'medium' ? 0.6 : 0.3,
        monthsRemaining: remainingYears !== undefined ? remainingYears * 12 : undefined,
        ageYears: sys.installYear ? currentYear - sys.installYear : undefined,
        installYear: sys.installYear,
        installSource: sys.installSource,
      };
    });
  }, [capitalTimeline]);

  // Navigate to system detail AND trigger advisor state
  const handleSystemClick = (systemKey: string) => {
    selectSystem(systemKey);
    navigate(`/system/${systemKey}`);
  };

  // Handle system click without navigation — set focus state for right column
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

  // Recommendation → chat handler (one-at-a-time guard)
  const handleRecommendationAction = useCallback((rec: Recommendation) => {
    if (chatLockedForRecommendation) return;
    setActiveRecommendation(rec);
    setChatLockedForRecommendation(true);
    const recLabel = rec.systemId ? getSystemDisplayName(rec.systemId) : 'your home';
    const opener = (RECOMMENDATION_CHAT_OPENERS[rec.actionType] ?? (() => ''))(recLabel, rec.confidenceDelta);
    navigate('/chat', { state: { intent: {
      systemKey: rec.systemId,
      initialAssistantMessage: opener || undefined,
    }}});
  }, [chatLockedForRecommendation, navigate]);

  // Open chat with optional intent context — navigates to /chat route
  const handleMobileChatOpen = useCallback((intent?: MobileChatIntent) => {
    navigate('/chat', { state: { intent: intent || null } });
  }, [navigate]);

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

  // ========================================================
  // 🚨 HOOKS BOUNDARY - Do not add hooks below this point.
  // React hooks must be declared above early returns.
  // ========================================================

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  // Snapshot redirect gate — single source of truth
  if (userHome?.id && !localStorage.getItem('habitta_has_seen_snapshot')) {
    navigate('/home-snapshot', { replace: true });
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
  // Treat as live if pulse_status is 'live' OR if stuck in enriching for >5 minutes
  const ENRICHMENT_TIMEOUT_MS = 5 * 60 * 1000;
  const isEffectivelyLive = userHome.pulse_status === 'live' || (
    (userHome.pulse_status === 'enriching' || userHome.pulse_status === 'initializing') &&
    userHome.created_at &&
    (Date.now() - new Date(userHome.created_at).getTime()) > ENRICHMENT_TIMEOUT_MS
  );
  const isEnriching = !isEffectivelyLive && (userHome.pulse_status === 'enriching' || userHome.pulse_status === 'initializing');


  // Mobile: Visual Home Pulse dashboard
  if (isMobile) {
    // Get active system key for drawer highlighting
    const activeSystemKey = focusContext.type === 'SYSTEM' ? focusContext.systemKey : undefined;
    
    // Build filtered timeline if attention filter is active
    const mobileTimeline = capitalTimeline && systemFilter === 'attention'
      ? {
          ...capitalTimeline,
          systems: capitalTimeline.systems.filter(s => getLateLifeState(s) !== 'not-late'),
        }
      : capitalTimeline;
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopHeader 
          address={fullAddress}
          healthStatus={getHealthStatus()}
          onAddressClick={handleAddressClick}
          onMenuOpen={() => setDrawerOpen(true)}
          onHealthBadgeClick={() => {
            setSystemFilter(prev => {
              const next = prev === 'all' ? 'attention' : 'all';
              trackMobileEvent(MOBILE_EVENTS.BADGE_FILTER_TOGGLED, { filter: next });
              return next;
            });
          }}
          filterActive={systemFilter === 'attention'}
          condensed
        />
        
        {/* System Drawer */}
        <MobileSystemDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          systems={capitalTimeline?.systems || []}
          activeSystemKey={activeSystemKey}
          address={fullAddress}
          onNavigate={(path) => {
            navigate(path);
            setDrawerOpen(false);
          }}
        />
        
        <main className="flex-1 p-3 pb-20 space-y-3">
          <MobileDashboardView
            capitalTimeline={mobileTimeline}
            onSystemTap={(systemKey) => navigate(`/system/${systemKey}`)}
            homeConfidence={homeConfidence}
            filterActive={systemFilter === 'attention'}
            onClearFilter={() => setSystemFilter('all')}
            isFirstVisit={isFirstVisit()}
            onWelcomeDismiss={() => markFirstVisitComplete()}
          />
        </main>
        
        <BottomNavigation onChatOpen={() => handleMobileChatOpen()} />
      </div>
    );
  }

  // Desktop: Full 3-column layout — wrapped in FocusStateProvider
  return (
    <FocusStateProvider>
      <DesktopLayout
        fullAddress={fullAddress}
        getHealthStatus={getHealthStatus}
        handleAddressClick={handleAddressClick}
        isXlScreen={isXlScreen}
        forecastLoading={forecastLoading}
        hvacLoading={hvacLoading}
        timelineLoading={timelineLoading}
        userHome={userHome}
        maintenanceTasks={maintenanceTasks}
        tasksLoading={tasksLoading}
        capitalTimeline={capitalTimeline}
        homeForecast={homeForecast}
        hvacPrediction={hvacPrediction}
        maintenanceTimelineData={maintenanceTimelineData}
        shouldChatBeOpen={shouldChatBeOpen}
        handleChatExpandChange={handleChatExpandChange}
        hasAgentMessage={hasAgentMessage}
        handleSystemFocus={handleSystemFocus}
        isEnriching={isEnriching}
        advisorState={advisorState}
        focusContext={focusContext}
        openingMessage={openingMessage}
        confidence={confidence}
        risk={risk}
        handleUserReply={handleUserReply}
        handleTaskComplete={handleTaskComplete}
        chatModeContext={chatModeContext}
        handleSystemUpdated={handleSystemUpdated}
        homeSystems={homeSystems}
        yearBuilt={userHome.year_built}
        baselineSystems={baselineSystems}
        homeConfidence={homeConfidence}
      />
    </FocusStateProvider>
  );
}

/**
 * DesktopLayout - Inner component consuming FocusStateContext.
 * Extracted so useFocusState() is called within FocusStateProvider.
 */
function DesktopLayout({
  fullAddress,
  getHealthStatus,
  handleAddressClick,
  isXlScreen,
  forecastLoading,
  hvacLoading,
  timelineLoading,
  userHome,
  maintenanceTasks,
  tasksLoading,
  capitalTimeline,
  homeForecast,
  hvacPrediction,
  maintenanceTimelineData,
  shouldChatBeOpen,
  handleChatExpandChange,
  hasAgentMessage,
  handleSystemFocus,
  isEnriching,
  advisorState,
  focusContext,
  openingMessage,
  confidence,
  risk,
  handleUserReply,
  handleTaskComplete,
  chatModeContext,
  handleSystemUpdated,
  homeSystems,
  yearBuilt,
  baselineSystems,
  homeConfidence,
}: any) {
  const { setFocus } = useFocusState();

  // Derive confidence level from baseline systems (same logic as MiddleColumn)
  const confidenceLevel = useMemo<'Unknown' | 'Early' | 'Moderate' | 'High'>(() => {
    const systems = baselineSystems || [];
    if (systems.length === 0) return 'Unknown';
    const avgConfidence = systems.reduce((sum: number, s: any) => sum + s.confidence, 0) / systems.length;
    if (avgConfidence >= 0.7) return 'High';
    if (avgConfidence >= 0.5) return 'Moderate';
    if (avgConfidence >= 0.3) return 'Early';
    return 'Unknown';
  }, [baselineSystems]);

  // Wrap system focus to also set FocusState for right column
  const onSystemClick = (systemKey: string) => {
    handleSystemFocus(systemKey);
    setFocus({ type: 'system', systemId: systemKey }, { push: true });
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <TopHeader 
        address={fullAddress}
        healthStatus={getHealthStatus()}
        onAddressClick={handleAddressClick}
      />
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-60 border-r bg-card shrink-0 hidden lg:flex flex-col">
          <LeftColumn 
            address={fullAddress}
            onAddressClick={handleAddressClick}
          />
        </aside>
        
        {isXlScreen ? (
          <ResizablePanelGroup 
            direction="horizontal" 
            className="flex-1 min-h-0"
            onLayout={(sizes: number[]) => {
              localStorage.setItem('dashboard_right_panel_size', sizes[1].toString());
            }}
          >
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
                  onSystemClick={onSystemClick}
                  isEnriching={isEnriching}
                  advisorState={advisorState}
                  focusContext={focusContext.type === 'SYSTEM' ? { systemKey: focusContext.systemKey, trigger: 'user' } : undefined}
                  openingMessage={openingMessage}
                  confidence={confidence}
                  risk={risk}
                  onUserReply={handleUserReply}
                  onTaskComplete={handleTaskComplete}
                  chatMode={chatModeContext.mode}
                  systemsWithLowConfidence={chatModeContext.systemsWithLowConfidence}
                  onSystemUpdated={handleSystemUpdated}
                  homeSystems={homeSystems}
                  yearBuilt={yearBuilt}
                  strengthScore={homeConfidence?.score}
                  strengthLevel={homeConfidence?.score != null ? getStrengthLevel(homeConfidence.score) : undefined}
                />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel 
              defaultSize={parseFloat(localStorage.getItem('dashboard_right_panel_size') || '40')} 
              minSize={30} 
              maxSize={45}
            >
              <aside className="border-l bg-muted/10 h-full overflow-y-auto p-6">
                <RightColumnSurface
                  loading={forecastLoading || hvacLoading || timelineLoading}
                  city={userHome.city}
                  state={userHome.state}
                  homeId={userHome.id}
                  yearBuilt={userHome.year_built}
                  maintenanceTasks={maintenanceTasks?.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    due_date: t.due_date,
                    priority: t.priority || 'medium',
                    status: t.status || 'pending',
                  })) || []}
                  maintenanceLoading={tasksLoading}
                  capitalSystems={capitalTimeline?.systems || []}
                  capitalTimeline={capitalTimeline}
                  confidenceLevel={confidenceLevel}
                />
              </aside>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col p-6 pb-0 hidden lg:flex">
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
              onSystemClick={onSystemClick}
              isEnriching={isEnriching}
              isMobile={true}
              advisorState={advisorState}
              focusContext={focusContext.type === 'SYSTEM' ? { systemKey: focusContext.systemKey, trigger: 'user' } : undefined}
              openingMessage={openingMessage}
              confidence={confidence}
              risk={risk}
              onUserReply={handleUserReply}
              onTaskComplete={handleTaskComplete}
              chatMode={chatModeContext.mode}
              systemsWithLowConfidence={chatModeContext.systemsWithLowConfidence}
              onSystemUpdated={handleSystemUpdated}
              strengthScore={homeConfidence?.score}
              strengthLevel={homeConfidence?.score != null ? getStrengthLevel(homeConfidence.score) : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
