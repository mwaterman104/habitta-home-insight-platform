import { ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopHeader, LeftColumn } from "@/components/dashboard-v3";
import BottomNavigation from "@/components/BottomNavigation";
import { Loader2 } from "lucide-react";
import { ChatContextProvider, useChatContext } from "@/contexts/ChatContext";
import { ContextualChatPanel } from "@/components/chat/ContextualChatPanel";
import { MobileChatSheet } from "@/components/dashboard-v3/mobile";
import { getContextualAssistantMessage } from "@/lib/chatContextCopy";
import { useCapitalTimeline } from "@/hooks/useCapitalTimeline";
import { useHomeConfidence } from "@/hooks/useHomeConfidence";
import { getStrengthLevel } from "@/components/home-profile/HomeProfileRecordBar";

interface DashboardV3LayoutProps {
  children: ReactNode;
}

interface UserHome {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  year_built: number | null;
  square_feet: number | null;
  latitude: number | null;
  longitude: number | null;
  confidence: number | null;
  status: string | null;
}

/**
 * DashboardV3Layout - Shared layout wrapper for V3-style pages
 * 
 * Provides consistent navigation (TopHeader, LeftColumn, BottomNavigation)
 * across all authenticated pages using the V3 design system.
 */
export function DashboardV3Layout({ children }: DashboardV3LayoutProps) {
  return (
    <ChatContextProvider>
      <DashboardV3LayoutInner>{children}</DashboardV3LayoutInner>
    </ChatContextProvider>
  );
}

function DashboardV3LayoutInner({ children }: DashboardV3LayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { chatContext, isOpen, closeChat } = useChatContext();
  
  const [userHome, setUserHome] = useState<UserHome>({
    id: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    year_built: null,
    square_feet: null,
    latitude: null,
    longitude: null,
    confidence: null,
    status: null,
  });
  const [loading, setLoading] = useState(true);

  // Fetch user's home data
  useEffect(() => {
    if (!user) return;
    
    const fetchUserHome = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('homes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const home = data[0];
          setUserHome({
            id: home.id,
            address: home.address || '',
            city: home.city || '',
            state: home.state || '',
            zip_code: home.zip_code || '',
            year_built: home.year_built,
            square_feet: home.square_feet,
            latitude: home.latitude,
            longitude: home.longitude,
            confidence: home.confidence,
            status: home.status,
          });
        }
      } catch (error) {
        console.error('Error fetching user home:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserHome();
  }, [user]);

  const fullAddress = userHome.address 
    ? `${userHome.address}, ${userHome.city}, ${userHome.state} ${userHome.zip_code}`
    : '';

  const handleAddressClick = () => {
    navigate('/home-profile');
  };

  // Derive health status for header (simplified version)
  const getHealthStatus = (): 'healthy' | 'attention' | 'critical' => {
    const confidence = userHome.confidence ?? 50;
    if (confidence >= 70) return 'healthy';
    if (confidence >= 40) return 'attention';
    return 'critical';
  };

  // Capital timeline + confidence for RecordBar in chat panel
  const { timeline: capitalTimeline } = useCapitalTimeline({ homeId: userHome.id || undefined, enabled: !!userHome.id });
  const { confidence: homeConfidence } = useHomeConfidence(
    userHome.id || undefined,
    capitalTimeline?.systems || [],
    userHome.year_built
  );
  const strengthScore = homeConfidence?.score;
  const strengthLevel = strengthScore != null ? getStrengthLevel(strengthScore) : undefined;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <TopHeader 
          address={fullAddress}
          healthStatus={getHealthStatus()}
          onAddressClick={handleAddressClick}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
        <BottomNavigation />
        
        {/* Mobile contextual chat */}
        {isOpen && chatContext && (
          <MobileChatSheet
            open={isOpen}
            onClose={closeChat}
            propertyId={userHome.id}
            baselineSystems={[]}
            confidenceLevel="Moderate"
            yearBuilt={userHome.year_built ?? undefined}
            focusContext={chatContext.systemKey ? { systemKey: chatContext.systemKey, trigger: chatContext.trigger || '' } : undefined}
            initialAssistantMessage={getContextualAssistantMessage(chatContext)}
            autoSendMessage={chatContext.autoSendMessage}
          />
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <TopHeader 
        address={fullAddress}
        healthStatus={getHealthStatus()}
        onAddressClick={handleAddressClick}
      />
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Column - Navigation */}
        <aside className="w-60 border-r bg-card shrink-0 hidden lg:flex flex-col">
          <LeftColumn 
            address={fullAddress}
            onAddressClick={handleAddressClick}
          />
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {children}
        </main>
        
        {/* Desktop contextual chat panel - inline sibling */}
        <ContextualChatPanel 
          propertyId={userHome.id}
          yearBuilt={userHome.year_built ?? undefined}
          strengthScore={strengthScore}
          strengthLevel={strengthLevel}
        />
      </div>
    </div>
  );
}
