/**
 * HomeOverviewPanel - Default right column state.
 * Wraps the current RightColumn content (map, conditions, calendar).
 */

import { Skeleton } from "@/components/ui/skeleton";
import { PropertyMap } from "../PropertyMap";
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

interface IntelligenceOverlay {
  comparableHomesCount?: number;
  permitActivity?: 'normal' | 'elevated';
  environmentalContext?: string;
}

export interface HomeOverviewPanelProps {
  loading: boolean;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  city?: string;
  state?: string;
  intelligenceOverlay?: IntelligenceOverlay;
  onMapClick?: () => void;
  maintenanceTasks?: MaintenanceTask[];
  maintenanceLoading?: boolean;
}

export function HomeOverviewPanel({
  loading,
  latitude,
  longitude,
  address,
  city,
  state,
  intelligenceOverlay,
  onMapClick,
  maintenanceTasks = [],
  maintenanceLoading = false,
}: HomeOverviewPanelProps) {
  const climate = deriveClimateZone(state, city, latitude);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const comparablePattern = intelligenceOverlay?.comparableHomesCount
    ? `${intelligenceOverlay.comparableHomesCount} comparable homes in area`
    : "No unusual patterns detected";

  return (
    <div className="space-y-6">
      <PropertyMap
        lat={latitude}
        lng={longitude}
        address={address}
        city={city}
        state={state}
        className="rounded-xl"
        intelligenceOverlay={intelligenceOverlay}
        onMapClick={onMapClick}
      />

      <LocalConditions
        climateZone={getClimateZoneLabel(climate.zone)}
        environmentalStress={getEnvironmentalStressLabel(climate.zone)}
        comparableHomesPattern={comparablePattern}
      />

      <MaintenanceCalendarWidget
        tasks={maintenanceTasks}
        loading={maintenanceLoading}
      />
    </div>
  );
}
