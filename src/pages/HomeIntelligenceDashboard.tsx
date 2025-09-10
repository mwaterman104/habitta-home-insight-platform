import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";

// Import client demo components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../client/components/ui/tabs";
import TodaysPriorities from "../../client/components/TodaysPriorities";
import RepairReadiness from "../../client/components/RepairReadiness";
import SystemHealthStrip from "../../client/components/SystemHealthStrip";
import ThisWeekChecklist from "../../client/components/ThisWeekChecklist";
import ReplacementPlannerTable from "../../client/components/ReplacementPlannerTable";
import GenerateSeasonalPlanButton from "../../client/components/GenerateSeasonalPlanButton";
import NeighborhoodComparison from "../../client/components/NeighborhoodComparison";
import TasksList from "../../client/components/TasksList";
import MaintenanceHistory from "../../client/components/MaintenanceHistory";
import SeasonalExperienceHero from "../../client/components/SeasonalExperienceHero";
import LifestyleReadinessPanel from "../../client/components/LifestyleReadinessPanel";
import LifestyleEnergyBenefits from "../../client/components/LifestyleEnergyBenefits";
import SeasonalEnergyReadiness from "../../client/components/SeasonalEnergyReadiness";
import LifestyleTimeline from "../../client/components/LifestyleTimeline";
import PartnerOpportunities from "../../client/components/PartnerOpportunities";
import PropertyIntelligenceTab from "../../client/components/PropertyIntelligenceTab";
import NeighborhoodPeerBenchmark from "../../client/components/NeighborhoodPeerBenchmark";
import CostImpactModel from "../../client/components/CostImpactModel";

// Import live components
import LiveUpcomingTasksCard from "../components/live/LiveUpcomingTasksCard";
import LiveCompletedStats from "../components/live/LiveCompletedStats";
import LiveHomeConditionCard from "../components/live/LiveHomeConditionCard";
import LiveHomeValueCard from "../components/live/LiveHomeValueCard";

import { useHabittaLive } from "@/hooks/useHabittaLive";

interface HomeData {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  year_built: number;
  square_feet: number;
  bedrooms: number;
  bathrooms: number;
}

export default function HomeIntelligenceDashboard() {
  const { homeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [home, setHome] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrichedData, setEnrichedData] = useState<any>(null);

  // Get live data using the new hook
  const { alerts, systemHealth, tasksSummary, refreshKey } = useHabittaLive(homeId);

  useEffect(() => {
    if (!user || !homeId) return;

    const fetchHome = async () => {
      try {
        const { data, error } = await supabase
          .from('homes')
          .select(`
            *,
            addresses (
              *,
              property_enrichment (*)
            )
          `)
          .eq('id', homeId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setHome(data);
        
        // Set enriched data if available
        if (data.addresses?.property_enrichment?.length > 0) {
          setEnrichedData(data.addresses.property_enrichment[0]);
        }
      } catch (error: any) {
        toast({
          title: "Error Loading Home",
          description: error.message,
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, [user, homeId, navigate, toast]);

  const handleRefreshComplete = () => {
    // Refetch home data after refresh
    const fetchHomeData = async () => {
      if (!user || !homeId) return;
      
      try {
        const { data, error } = await supabase
          .from('homes')
          .select(`
            *,
            addresses (
              *,
              property_enrichment (*)
            )
          `)
          .eq('id', homeId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setHome(data);
          if (data.addresses?.property_enrichment?.length > 0) {
            setEnrichedData(data.addresses.property_enrichment[0]);
          }
        }
      } catch (error) {
        console.error('Error refreshing home data:', error);
      }
    };

    fetchHomeData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!home) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Home Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested home could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Home Intelligence Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {home.address}, {home.city}, {home.state} • What needs attention today • Smart recommendations • Preventive insights
            </p>
          </div>
        </div>
        
        {/* Property Details Bar */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Built:</span>
            <span className="text-sm">{home.year_built || enrichedData?.attributes?.year_built || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Size:</span>
            <span className="text-sm">{home.square_feet || enrichedData?.attributes?.square_feet ? `${home.square_feet || enrichedData.attributes.square_feet} sq ft` : '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Beds:</span>
            <span className="text-sm">{home.bedrooms || enrichedData?.attributes?.beds || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Baths:</span>
            <span className="text-sm">{home.bathrooms || enrichedData?.attributes?.baths || '—'}</span>
          </div>
          {(enrichedData?.attributes?.lot_size) && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Lot:</span>
              <span className="text-sm">{enrichedData.attributes.lot_size} sq ft</span>
            </div>
          )}
          {enrichedData?.refreshed_at && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">
                Data refreshed: {new Date(enrichedData.refreshed_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="plan" className="rounded-xl">Plan</TabsTrigger>
          <TabsTrigger value="energy" className="rounded-xl">Energy</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl">History</TabsTrigger>
          <TabsTrigger value="property" className="rounded-xl">Property</TabsTrigger>
          <TabsTrigger value="intelligence" className="rounded-xl">Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Seasonal Experience Hero */}
          <SeasonalExperienceHero />

          {/* Primary Alert-Driven View */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TodaysPriorities alerts={alerts} />
            </div>
            <div>
              <RepairReadiness />
            </div>
          </div>

          {/* System Health Strip */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <h3 className="font-semibold mb-3">System Health</h3>
            <SystemHealthStrip systems={systemHealth} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div>
              <ThisWeekChecklist alerts={alerts} />
            </div>
            <div className="lg:col-span-2">
              <div className="grid lg:grid-cols-3 gap-4 mb-4 items-stretch">
                <LiveHomeConditionCard homeId={homeId} />
                <LiveHomeValueCard homeId={homeId} />
                <LifestyleReadinessPanel />
              </div>
              <LiveCompletedStats homeId={homeId} refreshKey={refreshKey} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <LifestyleTimeline />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <LiveUpcomingTasksCard homeId={homeId} refreshKey={refreshKey} />
              <ReplacementPlannerTable />
            </div>
            <div className="space-y-6">
              <GenerateSeasonalPlanButton />
              <CostImpactModel />
            </div>
          </div>
          <PartnerOpportunities />
        </TabsContent>

        <TabsContent value="energy" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <NeighborhoodComparison />
            <NeighborhoodPeerBenchmark />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <LifestyleEnergyBenefits />
            <SeasonalEnergyReadiness />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <MaintenanceHistory />
            <TasksList />
          </div>
        </TabsContent>

        <TabsContent value="property" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <NeighborhoodComparison />
            <NeighborhoodPeerBenchmark />
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <PropertyIntelligenceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}