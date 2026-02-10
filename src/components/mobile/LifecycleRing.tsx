/**
 * LifecycleRing — Purpose-built ring for Home Pulse
 * 
 * Visualizes progress through expected lifespan.
 * NOT a retrofit of Donut.tsx — different semantics, color logic, and copy contract.
 * 
 * RULES (Non-Negotiable):
 * - Ring fill = % of life consumed
 * - Ring NEVER turns red
 * - Ring does not imply failure timing
 * - Numeric display is years, not percent
 */

import { type ReactNode } from 'react';

// ============== Color Logic (Locked) ==============

const LIFECYCLE_COLORS = {
  early: 'hsl(145, 30%, 55%)',    // Muted green  — < 40%
  mid: 'hsl(180, 25%, 50%)',      // Neutral teal — 40-70%
  late: 'hsl(38, 60%, 55%)',      // Soft amber   — 70-90%
  end: 'hsl(38, 60%, 55%)',       // Soft amber   — > 90% (NEVER red)
} as const;

function getLifecycleColor(percentConsumed: number): string {
  const clamped = Math.max(0, Math.min(100, percentConsumed));
  if (clamped < 40) return LIFECYCLE_COLORS.early;
  if (clamped < 70) return LIFECYCLE_COLORS.mid;
  if (clamped < 90) return LIFECYCLE_COLORS.late;
  return LIFECYCLE_COLORS.end;
}

// ============== Component ==============

interface LifecycleRingProps {
  /** Percentage of lifespan consumed (0-100+, clamped internally) */
  percentConsumed: number;
  /** Ring size in pixels */
  size?: number;
  /** Override fill color (bypasses lifecycle color logic) */
  color?: string;
  /** Center content (e.g., "~7 years" or "~6 yrs") */
  children?: ReactNode;
}

export function LifecycleRing({
  percentConsumed,
  size = 96,
  color,
  children,
}: LifecycleRingProps) {
  const clamped = Math.max(0, Math.min(100, percentConsumed));
  const fillColor = color ?? getLifecycleColor(clamped);

  // Ring thickness proportional to size
  const thickness = Math.max(6, Math.round(size * 0.104));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillLength = (clamped / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={thickness}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={thickness}
          strokeDasharray={`${fillLength} ${circumference - fillLength}`}
          strokeLinecap="round"
        />
      </svg>

      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
