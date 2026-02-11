import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCapitalTimeline } from "@/hooks/useCapitalTimeline";
import { useChatMode } from "@/hooks/useChatMode";
import { ChatConsole } from "@/components/dashboard-v3/ChatConsole";
import type { BaselineSystem } from "@/components/dashboard-v3/BaselineSurface";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface MobileChatIntent {
  systemKey?: string;
  systemLabel?: string;
  initialAssistantMessage?: string;
  autoSendMessage?: string;
  focusContext?: { systemKey: string; trigger: string };
}

/**
 * MobileChatPage - Full-screen chat route for mobile
 * Replaces the MobileChatSheet drawer for cleaner lifecycle and back-button support.
 */
export default function MobileChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Read intent from navigation state
  const intent: MobileChatIntent | null = (location.state as any)?.intent ?? null;

  // Fetch user home
  const { data: userHome, isLoading: homeLoading } = useQuery({
    queryKey: ['user-home', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('homes')
        .select('id, year_built')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Capital timeline for baseline systems
  const { timeline, loading: timelineLoading } = useCapitalTimeline({
    homeId: userHome?.id,
    enabled: !!userHome?.id,
  });

  // Build baseline systems
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

  // Chat mode — use minimal defaults since we lack full system/permit data on this page
  const chatModeContext = useChatMode({
    systems: [],
    permitsFound: false,
    inferredSystems: baselineSystems,
  });

  // Opening message from intent
  const openingMessage = intent?.initialAssistantMessage
    ? { observation: intent.initialAssistantMessage, implication: "", optionsPreview: "" }
    : null;

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  if (homeLoading || timelineLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card">
        <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Ask Habitta</h1>
      </header>

      {/* Chat - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatConsole
          propertyId={userHome?.id || ''}
          baselineSystems={baselineSystems}
          confidenceLevel={baselineSystems.length > 0 ? 'Moderate' : 'Unknown'}
          yearBuilt={userHome?.year_built ?? undefined}
          focusContext={
            intent?.focusContext
              ? intent.focusContext
              : intent?.systemKey
                ? { systemKey: intent.systemKey, trigger: 'cta_intent' }
                : undefined
          }
          hasAgentMessage={!!openingMessage}
          openingMessage={openingMessage}
          chatMode={chatModeContext.mode}
          baselineSource={chatModeContext.baselineSource}
          systemsWithLowConfidence={chatModeContext.systemsWithLowConfidence}
          onWhyClick={() => {}}
          autoSendMessage={intent?.autoSendMessage}
        />
      </div>
    </div>
  );
}
