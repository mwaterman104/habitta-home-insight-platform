import React from 'react';
import { Info } from 'lucide-react';

export type HomeHealthStatus = 'healthy' | 'attention' | 'critical';

interface HomeProfileContextHeaderProps {
  status?: HomeHealthStatus;
}

/**
 * HomeProfileContextHeader - Context framing for Home Profile page
 * 
 * Immediately reframes the page from "property info" to "intelligence input."
 * Includes a subtle Home Pulse status indicator.
 */
export const HomeProfileContextHeader: React.FC<HomeProfileContextHeaderProps> = ({
  status = 'healthy'
}) => {
  const statusConfig: Record<HomeHealthStatus, { color: string; label: string }> = {
    healthy: { color: 'bg-emerald-500', label: 'Healthy' },
    attention: { color: 'bg-amber-500', label: 'Attention' },
    critical: { color: 'bg-red-500', label: 'Critical' },
  };

  const { color, label } = statusConfig[status];

  return (
    <div className="space-y-3">
      {/* Context framing - critical for trust */}
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-body text-foreground">
            This profile is how Habitta understands your home.
          </p>
          <p className="text-meta text-muted-foreground">
            It informs forecasts, system risk, and maintenance planning.
          </p>
        </div>
      </div>

      {/* Subtle Home Pulse indicator - small dot, not a banner */}
      <div className="flex items-center gap-2 text-meta text-muted-foreground">
        <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
        <span>Home Pulse: {label}</span>
      </div>
    </div>
  );
};
