interface DualPathForecastProps {
  current: number;
  withCare: [number, number];      // [12mo, 24mo]
  ifUntracked: [number, number];   // [12mo, 24mo]
}

/**
 * DualPathForecast - Visual fork showing "with Habitta" vs "if untracked"
 * 
 * IMPORTANT: Normalizes scores to prevent visual misinterpretation
 * Maps score range 50-100 → visual width 20-100%
 */
export function DualPathForecast({ current, withCare, ifUntracked }: DualPathForecastProps) {
  // Normalize scores to visual width (50-100 → 20-100%)
  const normalizeWidth = (score: number) => {
    const min = 50, max = 100;
    return Math.round(((Math.max(min, Math.min(max, score)) - min) / (max - min)) * 80 + 20);
  };

  return (
    <div className="bg-white/60 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          24-Month Outlook
        </span>
        <span className="text-xs text-muted-foreground">
          (relative health index)
        </span>
      </div>
      
      {/* With Habitta Care */}
      <div className="flex items-center gap-3">
        <div className="w-24 text-xs text-green-700 font-medium">
          With Habitta
        </div>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${normalizeWidth(withCare[1])}%` }}
          />
        </div>
        <div className="w-8 text-sm font-semibold text-green-700">
          {withCare[1]}
        </div>
      </div>
      
      {/* If untracked */}
      <div className="flex items-center gap-3">
        <div className="w-24 text-xs text-amber-600 font-medium">
          If untracked
        </div>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${normalizeWidth(ifUntracked[1])}%` }}
          />
        </div>
        <div className="w-8 text-sm font-semibold text-amber-600">
          {ifUntracked[1]}
        </div>
      </div>
    </div>
  );
}
