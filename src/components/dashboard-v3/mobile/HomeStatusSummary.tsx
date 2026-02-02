import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface HomeStatusSummaryProps {
  systems: SystemTimelineEntry[];
  healthStatus: 'healthy' | 'attention' | 'critical';
}

/**
 * HomeStatusSummary - Single-sentence plain English status
 * 
 * Mobile Render Contract: One sentence max, no metrics, no numbers unless critical.
 */
export function HomeStatusSummary({ systems, healthStatus }: HomeStatusSummaryProps) {
  const getSummaryText = (): string => {
    if (!systems || systems.length === 0) {
      return "Add your home systems to get personalized insights.";
    }

    // Find systems needing attention based on replacement window
    const currentYear = new Date().getFullYear();
    const criticalSystems = systems.filter(s => {
      const likelyYear = s.replacementWindow?.likelyYear;
      return likelyYear && likelyYear <= currentYear + 2;
    });
    const watchSystems = systems.filter(s => {
      const likelyYear = s.replacementWindow?.likelyYear;
      return likelyYear && likelyYear > currentYear + 2 && likelyYear <= currentYear + 5;
    });

    switch (healthStatus) {
      case 'critical':
        if (criticalSystems.length > 0) {
          const systemName = criticalSystems[0].systemLabel;
          return `Your ${systemName} may need attention soon.`;
        }
        return "One of your systems may need attention.";
      
      case 'attention':
        if (watchSystems.length > 0) {
          const systemName = watchSystems[0].systemLabel;
          return `Your ${systemName} is worth keeping an eye on.`;
        }
        return "Your home is mostly stable with one item to watch.";
      
      case 'healthy':
      default:
        return "Your home is stable — all systems operating normally.";
    }
  };

  return (
    <div className="px-1">
      <p className="text-[15px] text-foreground leading-relaxed">
        {getSummaryText()}
      </p>
    </div>
  );
}
