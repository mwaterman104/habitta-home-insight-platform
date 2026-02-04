import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SystemPlanView } from "@/components/system/SystemPlanView";
import type { SystemTimelineEntry, CapitalSystemType, InstallSource, DataQuality, SystemCategory, WindowUncertainty } from "@/types/capitalTimeline";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isValidSystemKey, getSystemLabel as getSystemMetaLabel, SYSTEM_META } from "@/lib/systemMeta";

/**
 * SystemPlanPage - Route handler for /systems/:systemKey/plan
 * 
 * Fetches system data and renders SystemPlanView
 * Handles case where system type is valid but no data exists yet
 */
export default function SystemPlanPage() {
  const { systemKey } = useParams<{ systemKey: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if this is a valid system type
  const isValidSystem = systemKey ? isValidSystemKey(systemKey) : false;
  
  // Fetch user's home
  const { data: home } = useQuery({
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
  
  // Fetch system data
  const { data: systemData, isLoading } = useQuery({
    queryKey: ['system-plan', home?.id, systemKey],
    queryFn: async () => {
      if (!home?.id || !systemKey) return null;
      
      const { data, error } = await supabase
        .from('home_systems')
        .select('*')
        .eq('home_id', home.id)
        .eq('system_key', systemKey)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!home?.id && !!systemKey,
  });
  
  // Transform to SystemTimelineEntry (or create default for valid but missing systems)
  const system: SystemTimelineEntry | null = systemData ? {
    systemId: systemData.system_key as CapitalSystemType,
    systemLabel: getSystemLabel(systemData.system_key),
    category: getSystemCategory(systemData.system_key),
    installSource: (systemData.data_sources?.[0] as InstallSource) ?? 'unknown',
    installYear: systemData.install_date 
      ? new Date(systemData.install_date).getFullYear() 
      : systemData.manufacture_year ?? null,
    dataQuality: getDataQuality(systemData.confidence_score),
    replacementWindow: {
      earlyYear: calculateEarlyYear(systemData),
      likelyYear: calculateLikelyYear(systemData),
      lateYear: calculateLateYear(systemData),
      rationale: 'Based on system age and typical lifespan',
    },
    windowUncertainty: 'medium' as WindowUncertainty,
    capitalCost: {
      low: 6000,
      high: 12000,
      currency: 'USD',
      costDrivers: ['Brand', 'Efficiency rating', 'Installation complexity'],
    },
    lifespanDrivers: [],
    maintenanceEffect: {
      shiftsTimeline: true,
      expectedDelayYears: 2,
      explanation: 'Regular maintenance can extend system life',
    },
    disclosureNote: '',
  } : isValidSystem && systemKey ? createDefaultSystemEntry(systemKey as CapitalSystemType) : null;
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleStartPlanning = () => {
    // Navigate to chat with system context
    navigate('/dashboard', { 
      state: { 
        openChat: true, 
        systemContext: systemKey 
      } 
    });
  };
  
  const handleAddMaintenance = () => {
    // Navigate to system detail for adding maintenance
    navigate(`/systems/${systemKey}`);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
  
  // Valid system type but no data yet - show "no data" state with helpful guidance
  if (!systemData && isValidSystem && systemKey) {
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
            <p className="text-sm text-muted-foreground mt-1">No data available yet</p>
          </div>
          
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    We don't have information about your {systemLabel.toLowerCase()} yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your system details to get personalized planning recommendations, 
                    cost estimates, and timing guidance.
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
  
  return (
    <SystemPlanView
      system={system}
      onBack={handleBack}
      onStartPlanning={handleStartPlanning}
      onAddMaintenance={handleAddMaintenance}
    />
  );
}

// ============== Helper Functions ==============

function createDefaultSystemEntry(systemKey: CapitalSystemType): SystemTimelineEntry {
  const currentYear = new Date().getFullYear();
  
  return {
    systemId: systemKey,
    systemLabel: getSystemLabel(systemKey),
    category: getSystemCategory(systemKey),
    installSource: 'unknown' as InstallSource,
    installYear: null,
    dataQuality: 'low' as DataQuality,
    replacementWindow: {
      earlyYear: currentYear + 5,
      likelyYear: currentYear + 10,
      lateYear: currentYear + 15,
      rationale: 'Default estimate - add system details for accuracy',
    },
    windowUncertainty: 'high' as WindowUncertainty,
    capitalCost: {
      low: 6000,
      high: 12000,
      currency: 'USD',
      costDrivers: ['Brand', 'Efficiency rating', 'Installation complexity'],
    },
    lifespanDrivers: [],
    maintenanceEffect: {
      shiftsTimeline: true,
      expectedDelayYears: 2,
      explanation: 'Regular maintenance can extend system life',
    },
    disclosureNote: 'Add your system details for personalized recommendations',
  };
}

function getSystemLabel(systemKey: string): string {
  const labels: Record<string, string> = {
    hvac: 'HVAC System',
    roof: 'Roof',
    water_heater: 'Water Heater',
  };
  return labels[systemKey] ?? systemKey;
}

function getSystemCategory(systemKey: string): SystemCategory {
  if (systemKey === 'roof') return 'structural';
  if (systemKey === 'water_heater') return 'utility';
  return 'mechanical';
}

function getDataQuality(confidenceScore: number | null): DataQuality {
  if (!confidenceScore) return 'low';
  if (confidenceScore >= 0.8) return 'high';
  if (confidenceScore >= 0.5) return 'medium';
  return 'low';
}

function calculateEarlyYear(systemData: any): number {
  const installYear = systemData.install_date 
    ? new Date(systemData.install_date).getFullYear()
    : systemData.manufacture_year;
  
  if (!installYear) return new Date().getFullYear() + 5;
  
  const lifespanMin: Record<string, number> = {
    hvac: 12,
    roof: 18,
    water_heater: 8,
  };
  
  return installYear + (lifespanMin[systemData.system_key] ?? 12);
}

function calculateLikelyYear(systemData: any): number {
  const installYear = systemData.install_date 
    ? new Date(systemData.install_date).getFullYear()
    : systemData.manufacture_year;
  
  if (!installYear) return new Date().getFullYear() + 10;
  
  const lifespanTypical: Record<string, number> = {
    hvac: 15,
    roof: 22,
    water_heater: 10,
  };
  
  return installYear + (lifespanTypical[systemData.system_key] ?? 15);
}

function calculateLateYear(systemData: any): number {
  const installYear = systemData.install_date 
    ? new Date(systemData.install_date).getFullYear()
    : systemData.manufacture_year;
  
  if (!installYear) return new Date().getFullYear() + 15;
  
  const lifespanMax: Record<string, number> = {
    hvac: 18,
    roof: 30,
    water_heater: 12,
  };
  
  return installYear + (lifespanMax[systemData.system_key] ?? 18);
}
