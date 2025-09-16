import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import MobileTabNavigation from "../../src/components/MobileTabNavigation";
import { PullToRefresh } from "../../src/components/mobile/PullToRefresh";
import { useIsMobile } from "../../src/hooks/use-mobile";
import { useToast } from "../../src/hooks/use-toast";
import TodaysPriorities from "../components/TodaysPriorities";
import RepairReadiness from "../components/RepairReadiness";
import SystemHealthStrip from "../components/SystemHealthStrip";
import ThisWeekChecklist from "../components/ThisWeekChecklist";
import UpcomingTasksCard from "../components/UpcomingTasksCard";
import ReplacementPlannerTable from "../components/ReplacementPlannerTable";
import GenerateSeasonalPlanButton from "../components/GenerateSeasonalPlanButton";
import NeighborhoodComparison from "../components/NeighborhoodComparison";
import TasksList from "../components/TasksList";
import CompletedStats from "../components/CompletedStats";
import HomeConditionCard from "../components/HomeConditionCard";
import HomeValueCard from "../components/HomeValueCard";
import NeighborhoodPeerBenchmark from "../components/NeighborhoodPeerBenchmark";
import CostImpactModel from "../components/CostImpactModel";
import MaintenanceHistory from "../components/MaintenanceHistory";
import SeasonalExperienceHero from "../components/SeasonalExperienceHero";
import LifestyleReadinessPanel from "../components/LifestyleReadinessPanel";
import LifestyleEnergyBenefits from "../components/LifestyleEnergyBenefits";
import SeasonalEnergyReadiness from "../components/SeasonalEnergyReadiness";
import LifestyleTimeline from "../components/LifestyleTimeline";
import PartnerOpportunities from "../components/PartnerOpportunities";
import PropertyIntelligenceTab from "../components/PropertyIntelligenceTab";
import { SolarPotentialCard } from "../../src/components/SolarPotentialCard";
import { SolarSavingsEstimator } from "../../src/components/SolarSavingsEstimator";
import { useAlerts, useSystemHealth, useMoneySavings, useTasksSummary, useUserProfile } from "../hooks/useHabittaLocal";
import { useSolarInsights } from "../../src/hooks/useSolarInsights";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const alerts = useAlerts();
  const systemHealth = useSystemHealth();
  const moneySavings = useMoneySavings();
  const tasksSummary = useTasksSummary();
  const userProfile = useUserProfile();
  
  // Mock coordinates for solar analysis - replace with actual home coordinates
  const homeLatitude = 37.7749; // San Francisco example
  const homeLongitude = -122.4194;
  const { data: solarData, loading: solarLoading } = useSolarInsights(homeLatitude, homeLongitude);

  const dashboardTabs = [
    { value: "overview", label: "Overview" },
    { value: "plan", label: "Plan" },
    { value: "energy", label: "Energy" },
    { value: "history", label: "History" },
    { value: "property", label: "Property" },
    { value: "intelligence", label: "Intelligence" },
  ];

  const handleRefresh = async () => {
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Dashboard Updated",
      description: "Latest data has been synchronized.",
    });
    
    // Here you would typically refetch data
    console.log("Refreshing dashboard data...");
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Home Intelligence Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {userProfile.address} • What needs attention today • Smart recommendations • Preventive insights
          </p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        {isMobile ? (
          <MobileTabNavigation 
            tabs={dashboardTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        ) : (
          <TabsList className="grid w-full grid-cols-6 rounded-2xl">
            <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
            <TabsTrigger value="plan" className="rounded-xl">Plan</TabsTrigger>
            <TabsTrigger value="energy" className="rounded-xl">Energy</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl">History</TabsTrigger>
            <TabsTrigger value="property" className="rounded-xl">Property</TabsTrigger>
            <TabsTrigger value="intelligence" className="rounded-xl">Intelligence</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          {/* Seasonal Experience Hero */}
          <SeasonalExperienceHero />

          {/* Primary Alert-Driven View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <TodaysPriorities alerts={alerts} />
            </div>
            <div>
              <RepairReadiness />
            </div>
          </div>

          {/* System Health Strip */}
          <div className="bg-muted/30 rounded-2xl p-3 md:p-4">
            <h3 className="font-semibold mb-3">System Health</h3>
            <SystemHealthStrip systems={systemHealth} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div>
              <ThisWeekChecklist alerts={alerts} />
            </div>
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-stretch">
                <HomeConditionCard />
                <HomeValueCard />
                <LifestyleReadinessPanel />
              </div>
              <CompletedStats />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plan" className="space-y-4 md:space-y-6">
          <LifestyleTimeline />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-4 md:space-y-6">
              <UpcomingTasksCard />
              <ReplacementPlannerTable />
            </div>
            <div className="space-y-4 md:space-y-6">
              <GenerateSeasonalPlanButton />
              <CostImpactModel />
            </div>
          </div>
          <PartnerOpportunities />
        </TabsContent>

        <TabsContent value="energy" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <NeighborhoodComparison />
            <NeighborhoodPeerBenchmark />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <SolarPotentialCard solarData={solarData} loading={solarLoading} />
            <SolarSavingsEstimator solarData={solarData} loading={solarLoading} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <LifestyleEnergyBenefits />
            <SeasonalEnergyReadiness />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <MaintenanceHistory />
            <TasksList />
          </div>
        </TabsContent>

        <TabsContent value="property" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <NeighborhoodComparison />
            <NeighborhoodPeerBenchmark />
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4 md:space-y-6">
          <PropertyIntelligenceTab />
        </TabsContent>
      </Tabs>
    </div>
  </PullToRefresh>
);
}