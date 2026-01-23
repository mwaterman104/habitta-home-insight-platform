import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCapitalTimeline } from "@/hooks/useCapitalTimeline";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Cpu, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardV3Layout } from "@/layouts/DashboardV3Layout";

interface SystemCardData {
  key: string;
  name: string;
  ageYears?: number;
  status: 'healthy' | 'planning' | 'attention';
  remainingYears?: number;
}

const SYSTEM_DISPLAY: Record<string, { name: string; icon: string }> = {
  hvac: { name: 'HVAC', icon: '🌡️' },
  roof: { name: 'Roof', icon: '🏠' },
  water_heater: { name: 'Water Heater', icon: '🚿' },
  electrical: { name: 'Electrical', icon: '⚡' },
  plumbing: { name: 'Plumbing', icon: '🔧' },
  windows: { name: 'Windows', icon: '🪟' },
  appliances: { name: 'Appliances', icon: '🔌' },
};

/**
 * SystemsHub - Overview of all home systems
 * 
 * Accessible via /systems from the left navigation.
 * Each card links to /systems/:systemSlug for details.
 */
export default function SystemsHub() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  // Fetch capital timeline for system data
  const { timeline: capitalTimeline, loading: isLoading } = useCapitalTimeline({ 
    homeId: userHome?.id 
  });

  // Build system cards
  const systemCards = useMemo<SystemCardData[]>(() => {
    if (!capitalTimeline?.systems) return [];
    
    const currentYear = new Date().getFullYear();
    
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
  }, [capitalTimeline]);

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
          <h1 className="text-xl font-semibold">Your Home Systems</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : systemCards.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="p-8 text-center">
              <Cpu className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">No systems data yet</h2>
              <p className="text-sm text-muted-foreground">
                System information will appear here once we have more data about your home.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {systemCards.length} systems tracked. Click any system for detailed insights.
            </p>
            
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
                        <CardTitle className="text-base">{system.name}</CardTitle>
                      </div>
                      {getStatusBadge(system.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {system.ageYears !== undefined && (
                        <p className="text-sm text-muted-foreground">
                          {system.ageYears} years old
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
          </>
        )}
      </div>
    </DashboardV3Layout>
  );
}
