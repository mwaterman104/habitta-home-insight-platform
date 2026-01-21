import type { SystemOptimizationSignals } from '@/types/systemPrediction';
import {
  getMaintenanceCopy,
  getOwnershipFactors,
  getOwnershipFooter,
  getSmartTips,
  getPlanningCopy
} from '@/lib/optimizationCopy';
import { 
  MaintenanceImpactCard, 
  OwnershipFactorsCard, 
  SmartTipsCard, 
  PlanningAheadCard 
} from './optimization';

interface SystemOptimizationSectionProps {
  optimization: SystemOptimizationSignals;
  onMaintenanceCta?: () => void;
  onPlanningCta?: () => void;
}

/**
 * SystemOptimizationSection - Actionable guidance layer
 * 
 * Architecture: Backend provides signals → this component derives copy → renders cards
 * CRITICAL: All copy logic lives in optimizationCopy.ts, not here
 */
export function SystemOptimizationSection({ 
  optimization, 
  onMaintenanceCta, 
  onPlanningCta 
}: SystemOptimizationSectionProps) {
  // Derive all copy from signals (frontend owns presentation)
  const maintenanceCopy = getMaintenanceCopy(
    optimization.confidenceState,
    optimization.signals.maintenanceState
  );
  const factors = getOwnershipFactors(optimization.signals);
  const footer = getOwnershipFooter(optimization.confidenceState);
  const tips = getSmartTips(optimization.tipsContext);
  const planning = getPlanningCopy();

  // Show planning card when replacement is foreseeable and not low confidence
  const showPlanning =
    optimization.planningEligibility.isForeseeable &&
    optimization.confidenceState !== 'low';

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">System Optimization</h2>
        <p className="text-sm text-muted-foreground">
          Practical ways to extend lifespan, reduce risk, and avoid surprise costs.
        </p>
      </div>

      <MaintenanceImpactCard {...maintenanceCopy} onCta={onMaintenanceCta} />
      <OwnershipFactorsCard factors={factors} footer={footer} />
      <SmartTipsCard {...tips} />
      {showPlanning && <PlanningAheadCard {...planning} onCta={onPlanningCta} />}
    </section>
  );
}
