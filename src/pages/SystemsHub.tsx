import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCapitalTimeline } from "@/hooks/useCapitalTimeline";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, CheckCircle2, AlertTriangle, Clock, Plus, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardV3Layout } from "@/layouts/DashboardV3Layout";
import { TeachHabittaModal } from "@/components/TeachHabittaModal";
import { 
  calculateApplianceStatus, 
  APPLIANCE_ICONS, 
  APPLIANCE_DISPLAY_NAMES,
  getApplianceTier,
  type ApplianceKey
} from "@/lib/applianceTiers";
import { 
  resolveApplianceIdentity,
  getStatusCopy,
} from "@/lib/resolveApplianceIdentity";

interface SystemCardData {
  key: string;
  name: string;
  ageYears?: number;
  status: 'healthy' | 'planning' | 'attention';
  remainingYears?: number;
}

interface ApplianceCardData {
  id: string;
  systemKey: string;
  name: string;
  brand?: string;
  tier: 1 | 2;
  ageYears?: number;
  status: 'healthy' | 'planning' | 'attention';
  remainingYears?: number;
  typicalLifespan: number;
  // New: Resolved identity fields
  title: string;
  confidenceLabel: string | null;
  statusCopy: string;
}

const SYSTEM_DISPLAY: Record<string, { name: string; icon: string }> = {
  hvac: { name: 'HVAC', icon: '🌡️' },
  roof: { name: 'Roof', icon: '🏠' },
  water_heater: { name: 'Water Heater', icon: '🚿' },
  electrical: { name: 'Electrical', icon: '⚡' },
  plumbing: { name: 'Plumbing', icon: '🔧' },
  windows: { name: 'Windows', icon: '🪟' },
};

/**
 * SystemsHub - Overview of all home systems and appliances
 * 
 * Uses resolveApplianceIdentity for consistent display logic.
 * Displays structural systems (Tier 0) and appliances (Tier 1 & 2).
 */
export default function SystemsHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showTeachModal, setShowTeachModal] = useState(false);
  
  // Fetch user's home
  const { data: userHome } = useQuery({
    queryKey: ['user-home', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('homes')
        .select('id, address, property_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch capital timeline for structural system data
  const { timeline: capitalTimeline, loading: isSystemsLoading } = useCapitalTimeline({ 
    homeId: userHome?.id 
  });

  // Fetch appliances from home_systems (Tier 1 and 2)
  const { data: appliancesRaw, isLoading: isAppliancesLoading } = useQuery({
    queryKey: ['home-appliances', userHome?.id],
    queryFn: async () => {
      if (!userHome?.id) return [];
      const { data, error } = await supabase
        .from('home_systems')
        .select('id, system_key, brand, model, manufacture_year, images, confidence_scores, source')
        .eq('home_id', userHome.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userHome?.id,
  });

  // Fetch system catalog for lifespan data
  const { data: catalogData } = useQuery({
    queryKey: ['system-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_catalog')
        .select('key, display_name, typical_lifespan_years, appliance_tier');
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = isSystemsLoading || isAppliancesLoading;
  const currentYear = new Date().getFullYear();

  // Build structural system cards (Tier 0)
  const systemCards = useMemo<SystemCardData[]>(() => {
    if (!capitalTimeline?.systems) return [];
    
    return capitalTimeline.systems.map(sys => {
      const yearsToReplacement = sys.replacementWindow.likelyYear - currentYear;
      const ageYears = sys.installYear 
        ? currentYear - sys.installYear 
        : undefined;
      
      let status: SystemCardData['status'] = 'healthy';
      if (yearsToReplacement <= 3) {
        status = 'attention';
      } else if (yearsToReplacement <= 7) {
        status = 'planning';
      }
      
      return {
        key: sys.systemId,
        name: SYSTEM_DISPLAY[sys.systemId]?.name || sys.systemLabel,
        ageYears,
        status,
        remainingYears: yearsToReplacement > 0 ? yearsToReplacement : undefined,
      };
    });
  }, [capitalTimeline, currentYear]);

  // Build appliance cards using resolveApplianceIdentity
  const applianceCards = useMemo<ApplianceCardData[]>(() => {
    if (!appliancesRaw || !catalogData) return [];
    
    // Create catalog lookup
    const catalogMap = new Map(catalogData.map(c => [c.key, c]));
    
    return appliancesRaw.map(appliance => {
      // Extract base key from system_key
      const baseKey = appliance.system_key.split('_').slice(0, 2).join('_');
      const singleKey = appliance.system_key.split('_')[0];
      
      // Try to find catalog entry
      const catalogEntry = catalogMap.get(baseKey) || catalogMap.get(singleKey);
      const typicalLifespan = catalogEntry?.typical_lifespan_years || 12;
      const ageYears = appliance.manufacture_year 
        ? currentYear - appliance.manufacture_year 
        : undefined;
      
      const remainingYears = ageYears !== undefined 
        ? Math.max(0, typicalLifespan - ageYears) 
        : undefined;
      
      const status = calculateApplianceStatus(ageYears ?? null, typicalLifespan);
      
      // Get display name
      const displayName = catalogEntry?.display_name || 
        APPLIANCE_DISPLAY_NAMES[baseKey as ApplianceKey] || 
        APPLIANCE_DISPLAY_NAMES[singleKey as ApplianceKey] ||
        appliance.system_key;
      
      // Determine tier with proper typing
      const rawTier = catalogEntry?.appliance_tier ?? getApplianceTier(baseKey);
      const effectiveTier: 1 | 2 = rawTier === 1 ? 1 : rawTier === 2 ? 2 : 1;
      
      // === USE RESOLVER for identity ===
      const catalogInput = catalogEntry ? {
        key: catalogEntry.key,
        display_name: catalogEntry.display_name,
        typical_lifespan_years: catalogEntry.typical_lifespan_years,
        appliance_tier: catalogEntry.appliance_tier,
      } : null;
      
      // Safely parse confidence_scores
      const confidenceScores = (
        appliance.confidence_scores && 
        typeof appliance.confidence_scores === 'object' &&
        !Array.isArray(appliance.confidence_scores)
      ) ? appliance.confidence_scores as Record<string, number> : null;
      
      // Safely parse source
      const sourceData = (
        appliance.source && 
        typeof appliance.source === 'object' &&
        !Array.isArray(appliance.source)
      ) ? appliance.source as { install_source?: string } : null;
      
      const identity = resolveApplianceIdentity(
        {
          brand: appliance.brand,
          model: appliance.model,
          manufacture_year: appliance.manufacture_year,
          confidence_scores: confidenceScores,
          source: sourceData,
        },
        catalogInput
      );
      
      return {
        id: appliance.id,
        systemKey: appliance.system_key,
        name: displayName,
        brand: appliance.brand,
        tier: effectiveTier,
        ageYears,
        status,
        remainingYears,
        typicalLifespan,
        // Resolved identity fields
        title: identity.title,
        confidenceLabel: identity.confidenceLabel,
        statusCopy: getStatusCopy(status, effectiveTier),
      };
    }).filter(a => a.tier === 1 || a.tier === 2);
  }, [appliancesRaw, catalogData, currentYear]);

  // Count by tier
  const tier1Count = applianceCards.filter(a => a.tier === 1).length;
  const tier2Count = applianceCards.filter(a => a.tier === 2).length;

  const getStatusBadge = (status: SystemCardData['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
        );
      case 'planning':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Planning
          </Badge>
        );
      case 'attention':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Attention
          </Badge>
        );
    }
  };

  return (
    <DashboardV3Layout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="flex items-center gap-2 mb-6">
          <Cpu className="h-5 w-5 text-primary" />
          <h1 className="heading-h2">Your Home Systems</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : systemCards.length === 0 && applianceCards.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="p-8 text-center">
              <Cpu className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">No systems tracked yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first system or appliance to get started.
              </p>
              <Button onClick={() => setShowTeachModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add System
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Structural Systems Section */}
            {systemCards.length > 0 && (
              <section className="mb-8">
                <h2 className="heading-h3 text-muted-foreground mb-3">Structural Systems</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemCards.map(system => (
                    <Card 
                      key={system.key}
                      className={cn(
                        "rounded-xl cursor-pointer transition-all hover:shadow-md",
                        system.status === 'attention' && "border-red-200",
                        system.status === 'planning' && "border-amber-200",
                      )}
                      onClick={() => navigate(`/systems/${system.key}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {SYSTEM_DISPLAY[system.key]?.icon || '🔧'}
                            </span>
                            <CardTitle className="system-name text-base">{system.name}</CardTitle>
                          </div>
                          {getStatusBadge(system.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {system.ageYears !== undefined && (
                            <p className="text-sm text-muted-foreground">
                              ~{system.ageYears} years old
                            </p>
                          )}
                          {system.remainingYears !== undefined && (
                            <p className="text-sm text-muted-foreground">
                              ~{system.remainingYears} years remaining
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
            
            {/* Appliances Section - Using Resolved Identity */}
            {applianceCards.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <h2 className="heading-h3 text-muted-foreground">Appliances</h2>
                  <span className="text-xs text-muted-foreground">
                    {tier1Count > 0 && `${tier1Count} critical`}
                    {tier1Count > 0 && tier2Count > 0 && ' • '}
                    {tier2Count > 0 && `${tier2Count} tracked`}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {applianceCards.map(appliance => {
                    const baseKey = appliance.systemKey.split('_').slice(0, 2).join('_');
                    const singleKey = appliance.systemKey.split('_')[0];
                    const icon = APPLIANCE_ICONS[baseKey as ApplianceKey] || 
                      APPLIANCE_ICONS[singleKey as ApplianceKey] || '🔧';
                    
                    return (
                      <Card 
                        key={appliance.id}
                        className={cn(
                          "rounded-xl cursor-pointer transition-all hover:shadow-md",
                          appliance.tier === 2 && "opacity-70 border-dashed",
                          appliance.tier === 1 && appliance.status === 'attention' && "border-red-200",
                          appliance.tier === 1 && appliance.status === 'planning' && "border-amber-200",
                        )}
                        onClick={() => navigate(`/systems/${appliance.id}`)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{icon}</span>
                              <div>
                                {/* Composed title with inline confidence label */}
                                <CardTitle className="system-name text-base">
                                  {appliance.title}
                                  {appliance.confidenceLabel && (
                                    <span className="text-xs font-normal text-muted-foreground ml-1">
                                      · {appliance.confidenceLabel}
                                    </span>
                                  )}
                                </CardTitle>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            {appliance.ageYears !== undefined && (
                              <p className="text-sm text-muted-foreground">
                                ~{appliance.ageYears} years old
                              </p>
                            )}
                            {/* Status copy using resolver */}
                            <p className="text-sm text-muted-foreground">
                              {appliance.statusCopy}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Floating Action Button */}
        <Button
          onClick={() => setShowTeachModal(true)}
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-30"
          size="icon"
          aria-label="Add system"
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* TeachHabittaModal */}
        <TeachHabittaModal
          open={showTeachModal}
          onOpenChange={setShowTeachModal}
          homeId={userHome?.id || ''}
          onSystemAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['capital-timeline', userHome?.id] });
            queryClient.invalidateQueries({ queryKey: ['home-appliances', userHome?.id] });
          }}
        />
      </div>
    </DashboardV3Layout>
  );
}
