/**
 * SystemWatch - Sharpened One-Line Alert
 * 
 * Purpose: Wake the page up, not explain.
 * 
 * Rules:
 * - Max one system at a time
 * - Max one sentence
 * - Appears only when triggered
 * - No timelines, confidence explanations, or recommendations
 */

import { useMemo } from "react";
import type { SystemPrediction } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";

interface PlanningSystem {
  key: string;
  name: string;
  remainingYears: number;
}

interface SystemWatchProps {
  hvacPrediction: SystemPrediction | null;
  capitalTimeline: HomeCapitalTimeline | null;
  onSystemClick: (systemKey: string) => void;
  onChatExpand?: () => void;
}

const SYSTEM_NAMES: Record<string, string> = {
  hvac: 'HVAC',
  roof: 'Roof',
  water_heater: 'Water Heater',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  windows: 'Windows',
  appliances: 'Appliances',
};

export function SystemWatch({
  hvacPrediction,
  capitalTimeline,
}: SystemWatchProps) {
  const planningWindowSystems = useMemo(() => {
    const systems: PlanningSystem[] = [];
    const currentYear = new Date().getFullYear();

    // Check HVAC from prediction
    if (hvacPrediction) {
      const remainingYears = hvacPrediction.lifespan?.years_remaining_p50;
      if (remainingYears && remainingYears <= 7) {
        systems.push({
          key: 'hvac',
          name: 'HVAC',
          remainingYears,
        });
      }
    }

    // Check capital timeline systems
    capitalTimeline?.systems.forEach(sys => {
      // Skip if already added from HVAC prediction
      if (systems.some(s => s.key === sys.systemId)) return;
      
      const yearsToReplacement = sys.replacementWindow.likelyYear - currentYear;
      if (yearsToReplacement <= 7 && yearsToReplacement > 0) {
        systems.push({
          key: sys.systemId,
          name: SYSTEM_NAMES[sys.systemId] || sys.systemLabel,
          remainingYears: yearsToReplacement,
        });
      }
    });

    // Sort by most imminent first
    return systems.sort((a, b) => a.remainingYears - b.remainingYears);
  }, [hvacPrediction, capitalTimeline]);

  const primarySystem = planningWindowSystems[0];
  const isAllClear = planningWindowSystems.length === 0;

  // Render nothing if all clear
  if (isAllClear || !primarySystem) {
    return null;
  }

  // Sharpened: One sentence only
  return (
    <div className="text-sm text-muted-foreground py-2 px-1">
      {primarySystem.name} is approaching a decision window.
    </div>
  );
}
