/**
 * RightColumnSurface - Polymorphic panel switcher for the right column.
 * 
 * Renders the active panel based on FocusState.
 * Default: HomeOverviewPanel (map, conditions, calendar).
 * Panels replace — never stack.
 */

import { useFocusState } from "@/contexts/FocusStateContext";
import { HomeOverviewPanel, type HomeOverviewPanelProps } from "./panels/HomeOverviewPanel";
import { SystemPanel } from "./panels/SystemPanel";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface RightColumnSurfaceProps extends HomeOverviewPanelProps {
  /** Capital timeline systems for SystemPanel lookup */
  capitalSystems?: SystemTimelineEntry[];
}

export function RightColumnSurface({ capitalSystems = [], ...homeOverviewProps }: RightColumnSurfaceProps) {
  const { focus } = useFocusState();

  const renderPanel = () => {
    if (!focus) {
      return <HomeOverviewPanel {...homeOverviewProps} />;
    }

    switch (focus.type) {
      case 'system': {
        const system = capitalSystems.find(s => s.systemId === focus.systemId);
        return (
          <SystemPanel
            systemId={focus.systemId}
            system={system}
            initialTab={focus.tab}
          />
        );
      }
      // Phase 3: contractor panels
      case 'contractor_list':
      case 'contractor_detail':
      // Future panels
      case 'maintenance':
      case 'capital_plan':
        // Fallback to home overview until panels are built
        return <HomeOverviewPanel {...homeOverviewProps} />;
      default:
        return <HomeOverviewPanel {...homeOverviewProps} />;
    }
  };

  return (
    <div key={focus?.type ?? 'home'} className="animate-in fade-in slide-in-from-right-4 duration-200">
      {renderPanel()}
    </div>
  );
}
