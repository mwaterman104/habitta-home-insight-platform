/**
 * LifespanProgressBar - Visual representation of system lifespan window
 * 
 * Displays p10/p50/p90 markers scaled by LIFESPAN (years from install),
 * not calendar years. This ensures consistent visualization across systems
 * of different ages.
 * 
 * Labels: "Early life" | "Most likely" | "Late life" (no "failure" terminology)
 */

import { cn } from "@/lib/utils";

interface LifespanProgressBarProps {
  /** Installation date (ISO string or Date) */
  installDate: string | Date;
  /** Early failure date - 10th percentile (ISO string) */
  p10Date: string;
  /** Most likely failure date - 50th percentile (ISO string) */
  p50Date: string;
  /** Late failure date - 90th percentile (ISO string) */
  p90Date: string;
  /** Current system age in years */
  currentAge: number;
  /** Optional CSS class */
  className?: string;
}

export function LifespanProgressBar({
  installDate,
  p10Date,
  p50Date,
  p90Date,
  currentAge,
  className
}: LifespanProgressBarProps) {
  const install = typeof installDate === 'string' ? new Date(installDate) : installDate;
  const p10 = new Date(p10Date);
  const p50 = new Date(p50Date);
  const p90 = new Date(p90Date);
  
  // Calculate lifespan years for each marker
  const yearsToMs = 365.25 * 24 * 60 * 60 * 1000;
  const p10Years = (p10.getTime() - install.getTime()) / yearsToMs;
  const p50Years = (p50.getTime() - install.getTime()) / yearsToMs;
  const p90Years = (p90.getTime() - install.getTime()) / yearsToMs;
  
  // Bar spans from 0 to p90 lifespan years
  const maxYears = Math.max(p90Years, currentAge + 1); // Ensure current position fits
  
  // Calculate positions as percentages
  const currentPosition = Math.min((currentAge / maxYears) * 100, 100);
  const p10Position = (p10Years / maxYears) * 100;
  const p50Position = (p50Years / maxYears) * 100;
  const p90Position = (p90Years / maxYears) * 100;
  
  // Determine bar fill color based on current position relative to p10
  const getBarColor = () => {
    if (currentAge >= p10Years) {
      return 'bg-amber-500'; // In the warning zone
    }
    return 'bg-emerald-500';
  };
  
  return (
    <div className={cn("space-y-1", className)}>
      {/* Progress bar container */}
      <div className="relative h-2.5 bg-muted rounded-full">
        {/* Current age fill - solid color */}
        <div 
          className={cn("absolute left-0 top-0 h-full rounded-full", getBarColor())}
          style={{ width: `${currentPosition}%` }}
        />
        
        {/* Current position indicator - black dot */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-foreground rounded-full shadow-md z-10"
          style={{ left: `calc(${currentPosition}% - 6px)` }}
        />
        
        {/* Markers - taller, extending below the bar */}
        <Marker position={p10Position} color="bg-amber-500" />
        <Marker position={p50Position} color="bg-teal-600" />
        <Marker position={p90Position} color="bg-slate-700" />
      </div>
      
      {/* Labels - positioned below markers */}
      <div className="relative h-5 text-xs text-muted-foreground pt-1">
        <Label position={p10Position} label="Early life" />
        <Label position={p50Position} label="Most likely" />
        <Label position={p90Position} label="Late life" />
      </div>
    </div>
  );
}

interface MarkerProps {
  position: number;
  color: string;
}

function Marker({ position, color }: MarkerProps) {
  return (
    <div 
      className={cn("absolute w-0.5 rounded-full", color)}
      style={{ 
        left: `${position}%`,
        top: '-2px',
        height: 'calc(100% + 6px)'
      }}
    />
  );
}

interface LabelProps {
  position: number;
  label: string;
}

function Label({ position, label }: LabelProps) {
  // Adjust label position to prevent overflow
  const adjustedPosition = 
    position < 12 ? 0 : 
    position > 88 ? 100 : 
    position;
  
  const alignment = 
    position < 12 ? 'text-left' : 
    position > 88 ? 'text-right' : 
    'text-center -translate-x-1/2';
  
  return (
    <span 
      className={cn("absolute whitespace-nowrap text-[11px]", alignment)}
      style={{ 
        left: position < 12 ? 0 : position > 88 ? undefined : `${adjustedPosition}%`,
        right: position > 88 ? 0 : undefined
      }}
    >
      {label}
    </span>
  );
}
