import type { ReportResolvedItem } from '@/hooks/useHomeReport';
import { format, parseISO } from 'date-fns';

interface ResolvedHistorySectionProps {
  items: ReportResolvedItem[];
}

export function ResolvedHistorySection({ items }: ResolvedHistorySectionProps) {
  // Group by asset kind (humans think in objects, not timelines)
  const grouped = new Map<string, ReportResolvedItem[]>();
  for (const item of items) {
    const key = item.issue.assetKind ?? 'General';
    const existing = grouped.get(key) ?? [];
    existing.push(item);
    grouped.set(key, existing);
  }

  return (
    <section className="space-y-3">
      <h2 className="heading-h3 text-foreground">Resolved Issues & Work History</h2>

      {items.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            No resolved issues yet.
          </p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([assetKind, groupItems]) => (
          <div
            key={assetKind}
            className="bg-card rounded-lg border border-border p-4 space-y-3"
          >
            <h3 className="text-sm font-medium system-name text-foreground">
              {assetKind}
            </h3>

            {groupItems.map((item) => (
              <div
                key={item.issue.id}
                className="border-b border-border last:border-0 pb-3 last:pb-0"
              >
                <p className="text-sm text-foreground">{item.issue.title}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span>
                    Reported:{' '}
                    {format(parseISO(item.issue.createdAt), 'MMM d, yyyy')}
                  </span>
                  {item.resolvedAt && (
                    <span>
                      Resolved:{' '}
                      {format(parseISO(item.resolvedAt), 'MMM d, yyyy')}
                    </span>
                  )}
                  {item.resolution && (
                    <span>
                      Outcome: {item.resolution.title}
                    </span>
                  )}
                  {(item.issue.costActual ?? item.resolution?.costActual) && (
                    <span>
                      Cost: $
                      {(
                        item.issue.costActual ??
                        item.resolution?.costActual ??
                        0
                      ).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
