/**
 * HomeStatusHeader - Primary Status Signal
 * 
 * Wraps Today's Focus with section header for visual hierarchy.
 * 
 * Rules:
 * - Section header: "TODAY'S STATUS" (muted, uppercase, tracking)
 * - One sentence only
 * - Declarative, no action language
 * - No buttons, charts, or percentages
 */

interface HomeStatusHeaderProps {
  message: string;
  changedSinceLastVisit?: boolean;
}

export function HomeStatusHeader({ 
  message, 
  changedSinceLastVisit 
}: HomeStatusHeaderProps) {
  return (
    <div className="space-y-2">
      {/* Section header */}
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Today's Status
      </h2>
      
      {/* Primary statement */}
      <p className="text-lg font-medium text-foreground leading-relaxed">
        {message}
      </p>
      
      {/* Changed indicator */}
      {changedSinceLastVisit && (
        <span className="text-xs text-muted-foreground/70 block">
          Updated since your last visit
        </span>
      )}
    </div>
  );
}
