/**
 * TodaysFocusCard - Primary Authority Component
 * 
 * The center of dashboard authority.
 * Tells the homeowner what Habitta is thinking about today.
 * 
 * Rules:
 * - Always visible, never hidden
 * - One sentence only (hard limit enforced)
 * - No buttons unless state !== 'stable'
 * - Visual weight > all other components
 * - No charts, percentages, or dates
 */

import { Card, CardContent } from "@/components/ui/card";
import type { TodaysFocus } from "@/lib/todaysFocusCopy";

interface TodaysFocusCardProps {
  focus: TodaysFocus;
  onContextExpand?: () => void;
}

export function TodaysFocusCard({ focus, onContextExpand }: TodaysFocusCardProps) {
  return (
    <Card className="rounded-xl border-0 bg-transparent shadow-none">
      <CardContent className="py-6 px-2">
        {/* Primary statement - center of authority */}
        <p className="text-lg font-medium text-foreground leading-relaxed">
          {focus.message}
        </p>
        
        {/* Context trigger - only if not stable */}
        {focus.state !== 'stable' && onContextExpand && (
          <button
            onClick={onContextExpand}
            className="text-sm text-muted-foreground hover:text-foreground mt-3 transition-colors"
          >
            Why?
          </button>
        )}
        
        {/* Changed indicator - subtle */}
        {focus.changedSinceLastVisit && (
          <span className="text-xs text-muted-foreground/70 block mt-2">
            Updated since your last visit
          </span>
        )}
      </CardContent>
    </Card>
  );
}
