import React from 'react';
import { Info } from 'lucide-react';
import { 
  normalizeHealthStatus, 
  type InternalHealthStatus 
} from '@/lib/statusNormalization';

export type HomeHealthStatus = 'healthy' | 'attention' | 'critical';

interface HomeProfileContextHeaderProps {
  status?: HomeHealthStatus;
  changedSinceLastVisit?: boolean;
}

/**
 * HomeProfileContextHeader - Context framing for Home Profile page
 * 
 * Immediately reframes the page from "property info" to "intelligence input."
 * Includes a subtle status indicator (no "Home Pulse" branding per doctrine).
 */
export const HomeProfileContextHeader: React.FC<HomeProfileContextHeaderProps> = ({
  status = 'healthy',
  changedSinceLastVisit = false
}) => {
  const { color, label } = normalizeHealthStatus(
    status as InternalHealthStatus, 
    changedSinceLastVisit
  );

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

      {/* Subtle status indicator - no "Home Pulse" branding per doctrine */}
      <div className="flex items-center gap-2 text-meta text-muted-foreground">
        <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
        <span>Status: {label}</span>
      </div>
    </div>
  );
};
