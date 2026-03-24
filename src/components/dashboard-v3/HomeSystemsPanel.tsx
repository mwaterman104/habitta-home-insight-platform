/**
 * HomeSystemsPanel - Permanent right-column surface for System Outlook.
 * 
 * Wraps BaselineSurface with clickable system rows.
 * Supports collapsed (header-only) and full states via isCollapsed prop.
 * Single component with internal branching — never two trees.
 */

import { cn } from "@/lib/utils";
import { useFocusState } from "@/contexts/FocusStateContext";
import { SystemsHealthTimeline } from "./SystemsHealthTimeline";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";

interface HomeSystemsPanelProps {
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  capitalTimeline?: HomeCapitalTimeline | null;
  isCollapsed?: boolean;
}

export function HomeSystemsPanel({
  confidenceLevel,
  capitalTimeline,
  isCollapsed = false,
}: HomeSystemsPanelProps) {
  const { setFocus } = useFocusState();

  const handleSystemClick = (systemKey: string) => {
    setFocus({ type: 'system', systemId: systemKey }, { push: true });
  };

  const confidenceBadgeColor = {
    'Unknown': 'bg-slate-100 text-slate-600',
    'Early': 'bg-amber-50 text-amber-700',
    'Moderate': 'bg-teal-50 text-teal-700',
    'High': 'bg-emerald-50 text-emerald-700',
  }[confidenceLevel];

  return (
    <div className={cn(
      "overflow-hidden",
      "transition-all duration-150 ease-in-out"
    )}>
      {isCollapsed ? (
        /* Collapsed: header only */
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
          <p className="text-[13px] font-medium text-stone-900">
            Home Systems Health &amp; Timeline
          </p>
          <span className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-full",
            confidenceBadgeColor
          )}>
            {confidenceLevel} confidence
          </span>
        </div>
      ) : (
        /* Full: delegate to SystemsHealthTimeline */
        capitalTimeline && capitalTimeline.systems.length > 0 ? (
          <SystemsHealthTimeline
            timeline={capitalTimeline}
            onSystemClick={handleSystemClick}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-4 space-y-2">
            <p className="text-[13px] font-medium text-stone-900">
              Home Systems Health &amp; Timeline
            </p>
            <p className="text-xs text-stone-500 leading-relaxed">
              We're building your system profile. Add documentation to increase coverage.
            </p>
          </div>
        )
      )}
    </div>
  );
}
