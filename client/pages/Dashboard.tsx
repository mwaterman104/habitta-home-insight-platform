import UpcomingTasksCard from "../components/UpcomingTasksCard";
import ReplacementPlannerTable from "../components/ReplacementPlannerTable";
import GenerateSeasonalPlanButton from "../components/GenerateSeasonalPlanButton";
import NeighborhoodComparison from "../components/NeighborhoodComparison";
import TasksList from "../components/TasksList";
import CompletedStats from "../components/CompletedStats";
import PropertySummaryCards from "../components/PropertySummaryCards";
import NeighborhoodPeerBenchmark from "../components/NeighborhoodPeerBenchmark";
import CostImpactModel from "../components/CostImpactModel";
import MaintenanceHistory from "../components/MaintenanceHistory";

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Home Intelligence Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Predictive maintenance and smart home insights
        </p>
      </div>
      
      {/* Top Summary Row */}
      <div className="grid md:grid-cols-3 gap-4 mb-6 print:hidden">
        <div className="md:col-span-2">
          <PropertySummaryCards />
        </div>
        <div>
          <CompletedStats />
        </div>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <UpcomingTasksCard />
          <TasksList />
          <ReplacementPlannerTable />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <GenerateSeasonalPlanButton />
          <NeighborhoodComparison />
          <NeighborhoodPeerBenchmark />
          <CostImpactModel />
          <MaintenanceHistory />
        </div>
      </div>
    </div>
  );
}