import type { ReportEvent } from '@/hooks/useHomeReport';
import { format, parseISO } from 'date-fns';

interface DeferredRecommendationsSectionProps {
  items: ReportEvent[];
}

export function DeferredRecommendationsSection({
  items,
}: DeferredRecommendationsSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="heading-h3 text-foreground">Deferred Recommendations</h2>

      {items.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            No deferred recommendations.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          {items.map((item) => {
            const meta = item.metadata ?? {};
            const urgency = (meta as any).urgency ?? null;

            return (
              <div
                key={item.id}
                className="border-b border-border last:border-0 pb-3 last:pb-0"
              >
                {item.assetKind && (
                  <p className="text-xs text-muted-foreground system-name">
                    {item.assetKind}
                  </p>
                )}
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span>
                    Noted: {format(parseISO(item.createdAt), 'MMM d, yyyy')}
                  </span>
                  {urgency && <span>Urgency: {urgency}</span>}
                  {item.description && (
                    <span className="block w-full mt-1">{item.description}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
