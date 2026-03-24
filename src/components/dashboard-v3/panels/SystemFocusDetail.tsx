/**
 * SystemFocusDetail - "Investment Analysis" single-scroll detail view.
 *
 * Replaces the tabbed SystemPanel with a narrative-driven financial breakdown
 * that answers: "Why does this cost so much and how certain are we about the date?"
 */

import {
  ArrowLeft,
  Info,
  TrendingDown,
  Hammer,
  Clock,
  Calendar,
  ShieldCheck,
  MapPin,
  AlertCircle,
  Camera,
  History,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { deriveZone, getBarColor, getBadgeClasses } from "@/lib/dashboardUtils";
import { useChatContext } from "@/contexts/ChatContext";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface SystemFocusDetailProps {
  system: SystemTimelineEntry;
  onBack: () => void;
  currentYear: number;
  onVerifyPhoto?: () => void;
  onReportYear?: () => void;
  onUploadDoc?: () => void;
}

export function SystemFocusDetail({ system, onBack, currentYear, onVerifyPhoto, onReportYear, onUploadDoc }: SystemFocusDetailProps) {
  const { openChat } = useChatContext();
  const installYear = system.installYear ?? currentYear;
  const age = currentYear - installYear;
  const totalLife = system.replacementWindow.lateYear - installYear;
  const progressPercent = Math.min(Math.max((age / totalLife) * 100, 5), 100);

  const yearsToLikely = system.replacementWindow.likelyYear - currentYear;
  const zone = deriveZone(yearsToLikely);
  const barColor = getBarColor(zone);

  const laborLow = system.capitalCost.typicalLow ?? system.capitalCost.low * 0.4;
  const laborHigh = system.capitalCost.typicalHigh ?? system.capitalCost.high * 0.4;
  const delayYears = system.maintenanceEffect?.expectedDelayYears ?? 0;

  const handleGetQuotes = () => {
    openChat({
      type: 'system',
      systemKey: system.systemId,
      trigger: 'find_pro',
      autoSendMessage: `Find local contractors for ${system.systemLabel} replacement near my home.`,
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-300 pb-12">

      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-stone-900">{system.systemLabel}</h2>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              Investment Analysis
            </p>
          </div>
        </div>
        <span
          className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase",
            getBadgeClasses(zone)
          )}
        >
          {zone}
        </span>
      </div>

      {/* 2. Primary Financial Metric Card */}
      <div className="bg-stone-900 rounded-xl p-6 text-white shadow-lg shadow-stone-200 overflow-hidden relative">
        <div className="relative z-10">
          <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            Estimated Capital Outlay
          </p>
          <div className="text-3xl font-bold">
            ${(system.capitalCost.low / 1000).toFixed(1)}k &ndash; $
            {(system.capitalCost.high / 1000).toFixed(1)}k
          </div>
          {system.costAttributionLine && (
            <p className="mt-3 text-[11px] text-stone-400 leading-tight">
              {system.costAttributionLine}
            </p>
          )}
          {system.costDisclaimer && (
            <div className="mt-4 flex items-start gap-2 text-[10px] text-stone-500 italic">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{system.costDisclaimer}</span>
            </div>
          )}
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <TrendingDown className="w-32 h-32 text-white" />
        </div>
      </div>

      {/* 2b. Verification Path (low/medium confidence only) */}
      {system.dataQuality !== 'high' && (
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-stone-900">Verify for Better Accuracy</h3>
          </div>
          
          <p className="text-xs text-stone-600 mb-4 leading-relaxed">
            Our timeline for the {system.systemLabel} is an estimate. Help us refine it with a quick photo or update.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Primary: Camera */}
            <button
              onClick={onVerifyPhoto}
              className="flex flex-col items-center justify-center gap-2 bg-white border border-stone-200 p-4 rounded-xl shadow-sm active:bg-stone-50 transition-colors"
            >
              <div className="bg-stone-900 p-2 rounded-full">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-stone-800">Snap Photo</span>
              <span className="text-[9px] text-stone-400 text-center uppercase">Label or Surface</span>
            </button>

            {/* Secondary: User Report */}
            <button
              onClick={onReportYear}
              className="flex flex-col items-center justify-center gap-2 bg-white border border-stone-200 p-4 rounded-xl shadow-sm active:bg-stone-50 transition-colors"
            >
              <div className="bg-emerald-500 p-2 rounded-full">
                <History className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-stone-800">I Know the Year</span>
              <span className="text-[9px] text-stone-400 text-center uppercase">Manual Update</span>
            </button>
          </div>

          {/* Tertiary: Document Upload */}
          {onUploadDoc && (
            <button
              onClick={onUploadDoc}
              className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest hover:text-stone-600 transition-colors"
            >
              <FileText className="w-3 h-3" />
              Have a permit or invoice? Upload here
            </button>
          )}
        </div>
      )}

      {/* 3. Cost Context Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-stone-400">
            <Hammer className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Labor &amp; Parts</span>
          </div>
          <p className="text-base font-bold text-stone-800">
            ~${(laborLow / 1000).toFixed(1)}k &ndash; ${(laborHigh / 1000).toFixed(1)}k
          </p>
          <p className="text-[9px] text-stone-500 mt-1">Based on local regional labor rates</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-stone-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Maintenance ROI</span>
          </div>
          <p className="text-base font-bold text-emerald-600">+{delayYears} Years</p>
          <p className="text-[9px] text-stone-500 mt-1 line-clamp-2">
            {system.maintenanceEffect?.explanation || "Regular service extends unit reliability."}
          </p>
        </div>
      </div>

      {/* 4. Replacement Rationale Card */}
      <div className="bg-white p-6 rounded-xl border border-stone-100 shadow-sm">
        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">
          Why This Window
        </h3>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-500">Unit Age</span>
            <span className="font-bold text-stone-800">
              {age} Years (Installed {installYear})
            </span>
          </div>

          <div>
            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", barColor)}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-bold text-stone-400 uppercase">
              <span>Install</span>
              <span>Replacement Window</span>
              <span>Late</span>
            </div>
          </div>
        </div>

        {system.replacementWindow.rationale && (
          <p className="text-[11px] text-stone-600 leading-relaxed italic border-l-2 border-stone-200 pl-4 mb-6">
            &ldquo;{system.replacementWindow.rationale}&rdquo;
          </p>
        )}

        {/* Lifespan Drivers */}
        {system.lifespanDrivers.length > 0 && (
          <div className="space-y-2">
            {system.lifespanDrivers.map((driver, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-stone-50 p-2 rounded-lg text-[10px]"
              >
                <span className="text-stone-600 font-medium">{driver.factor}</span>
                <span
                  className={
                    driver.impact === "decrease" ? "text-red-500" : "text-emerald-500"
                  }
                >
                  {driver.impact === "decrease" ? "↓" : "↑"} {driver.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Evidence Summary */}
      <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={cn(
                "w-4 h-4",
                system.dataQuality === "high" ? "text-emerald-500" : "text-amber-500"
              )}
            />
            <span className="text-xs font-bold text-stone-800 capitalize tracking-tight">
              Confidence: {system.dataQuality}
            </span>
          </div>
          <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">
            Evidence Records
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="px-2 py-1 bg-stone-100 rounded text-[9px] font-bold text-stone-500 uppercase flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {system.installSource}
          </div>
          {system.materialType && (
            <div className="px-2 py-1 bg-stone-100 rounded text-[9px] font-bold text-stone-500 uppercase">
              {system.materialType}
            </div>
          )}
          {system.climateZone && (
            <div className="px-2 py-1 bg-stone-100 rounded text-[9px] font-bold text-stone-500 uppercase flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {system.climateZone}
            </div>
          )}
        </div>
      </div>

      {/* 6. Call to Action */}
      <button
        onClick={handleGetQuotes}
        className="w-full bg-stone-900 text-white text-xs font-bold py-4 rounded-xl hover:bg-stone-800 transition-all shadow-md active:scale-[0.98]"
      >
        Get Local Replacement Quotes
      </button>
    </div>
  );
}
