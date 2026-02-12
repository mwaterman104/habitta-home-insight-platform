/**
 * CapExBudgetRoadmap - Single-line financial horizon with lollipop pins.
 * 
 * Rivian-inspired minimalist CapEx visualization.
 * Pin heights scale logarithmically based on cost magnitude.
 */

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { HomeCapitalTimeline, SystemTimelineEntry } from "@/types/capitalTimeline";

interface CapExBudgetRoadmapProps {
  timeline: HomeCapitalTimeline;
  onSystemClick?: (systemId: string) => void;
}

const MIN_PIN_HEIGHT = 40;
const MAX_PIN_HEIGHT = 100;
const MIN_COST = 1000;
const MAX_COST = 50000;

function getPinHeight(costHigh: number): number {
  const clamped = Math.max(MIN_COST, Math.min(costHigh, MAX_COST));
  return MIN_PIN_HEIGHT + (Math.log(clamped / MIN_COST) / Math.log(MAX_COST / MIN_COST)) * (MAX_PIN_HEIGHT - MIN_PIN_HEIGHT);
}

function getPosition(year: number, currentYear: number, horizonYears: number): number {
  return Math.min(100, Math.max(0, ((year - currentYear) / horizonYears) * 100));
}

function formatCost(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value}`;
}

type PinType = 'urgent' | 'window' | 'distant';

function classifySystem(system: SystemTimelineEntry, currentYear: number, horizonYears: number): PinType {
  const yearsToLikely = system.replacementWindow.likelyYear - currentYear;
  if (yearsToLikely <= 3) return 'urgent';
  if (system.replacementWindow.earlyYear > currentYear + horizonYears) return 'distant';
  return 'window';
}

export function CapExBudgetRoadmap({ timeline, onSystemClick }: CapExBudgetRoadmapProps) {
  const currentYear = new Date().getFullYear();
  const horizonYears = timeline.horizonYears;
  const years = [currentYear, currentYear + 2, currentYear + 4, currentYear + 6, currentYear + 8, currentYear + 10];

  // Sort systems by likelyYear for rendering order
  const sortedSystems = [...timeline.systems].sort(
    (a, b) => a.replacementWindow.likelyYear - b.replacementWindow.likelyYear
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-lg font-bold text-stone-900 tracking-tightest">
          Capital Expenditure Budget Roadmap
        </h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-stone-400 cursor-help hover:text-stone-600 transition-colors" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                A 10-year financial horizon showing when major capital expenditures may occur.
                Pin height indicates relative cost magnitude. Shaded blocks show replacement windows.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Timeline visualization */}
      <div className="relative w-full" style={{ height: `${MAX_PIN_HEIGHT + 60}px` }}>
        {/* Pins and window blocks */}
        {sortedSystems.map((system) => {
          const pinType = classifySystem(system, currentYear, horizonYears);
          const likelyPos = getPosition(system.replacementWindow.likelyYear, currentYear, horizonYears);
          const height = getPinHeight(system.capitalCost.high);
          const costLabel = `${formatCost(system.capitalCost.low)}–${formatCost(system.capitalCost.high)}`;

          // Window block for mid-range systems
          const earlyPos = getPosition(system.replacementWindow.earlyYear, currentYear, horizonYears);
          const latePos = getPosition(system.replacementWindow.lateYear, currentYear, horizonYears);
          const showWindow = pinType === 'window' && (latePos - earlyPos) > 2;

          return (
            <div key={system.systemId}>
              {/* Shaded replacement window block */}
              {showWindow && (
                <div
                  className="absolute bottom-6 bg-teal-500/10 border-t-2 border-teal-500/30 rounded-sm"
                  style={{
                    left: `${earlyPos}%`,
                    width: `${latePos - earlyPos}%`,
                    height: '28px',
                  }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-teal-700">
                    {system.systemLabel}: {costLabel}
                  </span>
                </div>
              )}

              {/* Lollipop pin */}
              <div
                className={cn(
                  "absolute bottom-6 flex flex-col items-center cursor-pointer group",
                  "transition-transform hover:scale-105"
                )}
                style={{
                  left: `${likelyPos}%`,
                  height: `${height}px`,
                  transform: 'translateX(-50%)',
                }}
                onClick={() => onSystemClick?.(system.systemId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSystemClick?.(system.systemId)}
              >
                {/* Cost label (only shown for urgent or distant, not window which has its own label) */}
                {!showWindow && (
                  <span className={cn(
                    "absolute -top-5 whitespace-nowrap text-[10px] font-bold transition-transform group-hover:scale-110",
                    pinType === 'urgent' ? 'text-red-600' : 'text-stone-500'
                  )}>
                    {costLabel}
                  </span>
                )}

                {/* Circle top */}
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 bg-white z-10 flex-shrink-0",
                  pinType === 'urgent' ? 'border-red-500' : pinType === 'window' ? 'border-teal-500' : 'border-stone-400'
                )} />

                {/* Vertical stem */}
                <div className={cn(
                  "w-0.5 flex-1",
                  pinType === 'urgent' ? 'bg-red-500' : pinType === 'window' ? 'bg-teal-500' : 'bg-stone-300'
                )} />
              </div>
            </div>
          );
        })}

        {/* The main timeline line */}
        <div className="absolute bottom-6 left-0 w-full h-0.5 bg-stone-800" />
      </div>

      {/* Year markers */}
      <div className="flex justify-between px-0 mt-1">
        {years.map((year) => (
          <span key={year} className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
            {year === currentYear ? 'Now' : `'${year.toString().slice(-2)}`}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex gap-6 border-t border-stone-100 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[11px] text-stone-500 font-medium">High-Priority Expense</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1.5 bg-teal-500/20 border-t border-teal-500/40 rounded-sm" />
          <span className="text-[11px] text-stone-500 font-medium">Replacement Window</span>
        </div>
      </div>
    </div>
  );
}
