import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCapitalTimeline } from "@/hooks/useCapitalTimeline";
import { SystemPlanView } from "@/components/system/SystemPlanView";
import { MobileChatSheet } from "@/components/dashboard-v3/mobile";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import type { BaselineSystem } from "@/components/dashboard-v3/BaselineSurface";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isValidSystemKey, getSystemLabel as getSystemMetaLabel, SUPPORTED_SYSTEMS } from "@/lib/systemMeta";
import { CHAT_PRIMING, CHAT_FIRST_TURN, getSystemDisplayName } from "@/lib/mobileCopy";

/**
 * SystemPlanPage - Route handler for /systems/:systemKey/plan
 * 
 * IMPORTANT ARCHITECTURE GUARDRAIL:
 * This page MUST source systems from useCapitalTimeline (capital-timeline edge function).
 * 
 * DO NOT query home_systems directly.
 * 
 * Rationale:
 * - capitalTimeline is the definitive authority for lifecycle logic
 * - It resolves systems from multiple sources (permits, home age, user input)
 * - Direct home_systems queries miss permit-derived and inferred systems
 * - This caused the "No data available" bug for systems visible on desktop
 */
export default function SystemPlanPage() {
  const { systemKey } = useParams<{ systemKey: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if this is a valid system type
  const isValidSystem = systemKey ? isValidSystemKey(systemKey) : false;
  
  // Check if system has valid config (using SUPPORTED_SYSTEMS as proxy)
  const hasValidConfig = systemKey ? SUPPORTED_SYSTEMS.includes(systemKey as any) : false;
  
  // Chat sheet state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatIntent, setChatIntent] = useState<'general' | 'planning'>('general');
  
  // Fetch user's home
  const { data: home, isLoading: homeLoading } = useQuery({
    queryKey: ['user-home', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('homes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  
  // IMPORTANT: Use capitalTimeline as the canonical source of truth
  // Do NOT query home_systems directly - it misses permit-derived systems
  const { timeline, loading: timelineLoading, error: timelineError } = useCapitalTimeline({
    homeId: home?.id,
    enabled: !!home?.id,
  });
  
  // Find matching system in timeline
  const system: SystemTimelineEntry | null = (() => {
    // Guardrail: Timeline must be fully loaded before rendering
    if (!timeline || !timeline.systems) return null;
    
    // Find by systemId match
    return timeline.systems.find(s => s.systemId === systemKey) ?? null;
  })();
  
  // Build baseline systems for chat context
  // MUST be above all early returns to satisfy React hooks rules
  const baselineSystems: BaselineSystem[] = useMemo(() => {
    if (!timeline?.systems) return [];
    const currentYear = new Date().getFullYear();
    return timeline.systems.map(sys => {
      const likelyYear = sys.replacementWindow?.likelyYear;
      const remainingYears = likelyYear ? likelyYear - currentYear : undefined;
      
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
  }, [timeline]);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleStartPlanning = () => {
    setChatIntent('planning');
    setChatOpen(true);
  };
  
  const handleChatExpand = () => {
    setChatIntent('general');
    setChatOpen(true);
  };
  
  const handleAddMaintenance = () => {
    // Navigate to system detail for adding maintenance
    navigate(`/systems/${systemKey}`);
  };
  
  // Handle loading state (home or timeline still fetching)
  if (homeLoading || timelineLoading || (home?.id && !timeline)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Handle timeline error
  if (timelineError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <p className="text-muted-foreground">Unable to load system data.</p>
        <button 
          onClick={handleBack}
          className="text-primary mt-4"
        >
          Go back
        </button>
      </div>
    );
  }
  
  // Invalid system key (not in our supported systems)
  if (!isValidSystem) {
    return (
      <div className="min-h-screen bg-background p-4">
        <p className="text-muted-foreground">System not found.</p>
        <button 
          onClick={handleBack}
          className="text-primary mt-4"
        >
          Go back
        </button>
      </div>
    );
  }
  
  // Valid system type but no config available yet
  if (!hasValidConfig && systemKey) {
    return (
      <div className="min-h-screen bg-background p-4">
        <p className="text-muted-foreground">
          Planning data for this system is coming soon.
        </p>
        <button 
          onClick={handleBack}
          className="text-primary mt-4"
        >
          Go back
        </button>
      </div>
    );
  }
  
  // Valid system type but not in timeline - show "not detected" state
  if (!system && isValidSystem && systemKey && timeline?.systems) {
    const systemLabel = getSystemMetaLabel(systemKey);
    
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-sm">← Back</span>
          </button>
        </header>
        
        <div className="p-4 space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{systemLabel}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This system isn't detected for this home
            </p>
          </div>
          
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    We haven't detected a {systemLabel.toLowerCase()} for your home.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    If you believe this is incorrect, you can add it manually.
                  </p>
                </div>
              </div>
              
              <div className="pt-2 space-y-2">
                <Button 
                  onClick={() => navigate(`/systems/${systemKey}`)}
                  className="w-full"
                >
                  Add {systemLabel} Details
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleBack}
                  className="w-full"
                >
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Final fallback if somehow we still don't have a system
  if (!system) {
    return (
      <div className="min-h-screen bg-background p-4">
        <p className="text-muted-foreground">System not found.</p>
        <button 
          onClick={handleBack}
          className="text-primary mt-4"
        >
          Go back
        </button>
      </div>
    );
  }
  
  // Get display name for priming message
  const displayName = system.systemLabel || getSystemDisplayName(system.systemId);
  
  // Generate priming message for this system
  const primingMessage = CHAT_PRIMING.systemPlan(displayName, system.installYear);
  
  return (
    <>
      <SystemPlanView
        system={system}
        onBack={handleBack}
        onStartPlanning={handleStartPlanning}
        onAddMaintenance={handleAddMaintenance}
        onChatExpand={handleChatExpand}
      />
      
      {/* Mobile Chat Sheet */}
      <MobileChatSheet
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        propertyId={home?.id || ''}
        baselineSystems={baselineSystems}
        confidenceLevel="Moderate"
        focusContext={{ 
          systemKey: systemKey!, 
          trigger: chatIntent === 'planning' ? 'start_planning' : 'plan_view' 
        }}
        {...(chatIntent === 'planning'
          ? { initialAssistantMessage: CHAT_FIRST_TURN.systemPlanning(displayName) }
          : { primingMessage }
        )}
        chatMode="silent_steward"
        baselineSource="inferred"
      />
    </>
  );
}
