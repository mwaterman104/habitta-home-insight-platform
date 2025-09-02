import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
import { useAlerts, useSystemHealth, useMoneySavings, useTasksSummary, useUserProfile } from "../hooks/useHabittaLocal";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const alerts = useAlerts();
  const systemHealth = useSystemHealth();
  const moneySavings = useMoneySavings();
  const tasksSummary = useTasksSummary();
  const userProfile = useUserProfile();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Home Intelligence Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {userProfile.address} • What needs attention today • Smart recommendations • Preventive insights
        </p>
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
                <HomeConditionCard />
                <HomeValueCard />
                <LifestyleReadinessPanel />
              </div>
              <CompletedStats />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <LifestyleTimeline />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <UpcomingTasksCard />
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