/**
 * HomeOverviewPanel - Default right column state.
 * Wraps the current RightColumn content (map, conditions, calendar).
 */

import { Skeleton } from "@/components/ui/skeleton";
import { LocalConditions } from "../LocalConditions";
import { MaintenanceCalendarWidget } from "../MaintenanceCalendarWidget";
import { deriveClimateZone } from "@/lib/climateZone";
import { getClimateZoneLabel, getEnvironmentalStressLabel } from "@/lib/dashboardRecoveryCopy";

interface MaintenanceTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
}

export interface HomeOverviewPanelProps {
  loading: boolean;
  city?: string;
  state?: string;
  maintenanceTasks?: MaintenanceTask[];
  maintenanceLoading?: boolean;
}

export function HomeOverviewPanel({
  loading,
  city,
  state,
  maintenanceTasks = [],
  maintenanceLoading = false,
}: HomeOverviewPanelProps) {
  const climate = deriveClimateZone(state, city);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LocalConditions
        climateZone={getClimateZoneLabel(climate.zone)}
        environmentalStress={getEnvironmentalStressLabel(climate.zone)}
        comparableHomesPattern="No unusual patterns detected"
      />

      <MaintenanceCalendarWidget
        tasks={maintenanceTasks}
        loading={maintenanceLoading}
      />
    </div>
  );
}
