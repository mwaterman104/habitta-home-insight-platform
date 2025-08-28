import UpcomingTasksCard from "../components/UpcomingTasksCard";
import ReplacementPlannerTable from "../components/ReplacementPlannerTable";
import GenerateSeasonalPlanButton from "../components/GenerateSeasonalPlanButton";
import NeighborhoodComparison from "../components/NeighborhoodComparison";

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Home Intelligence Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Predictive maintenance and smart home insights
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <UpcomingTasksCard />
          <ReplacementPlannerTable />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <GenerateSeasonalPlanButton />
          <NeighborhoodComparison />
        </div>
      </div>
    </div>
  );
}