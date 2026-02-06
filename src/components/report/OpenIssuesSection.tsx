import { Badge } from '@/components/ui/badge';
import type { ReportOpenIssue } from '@/hooks/useHomeReport';
import { format, parseISO } from 'date-fns';

interface OpenIssuesSectionProps {
  issues: ReportOpenIssue[];
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-destructive';
    case 'high':
      return 'text-destructive';
    case 'moderate':
      return 'text-warning';
    default:
      return 'text-muted-foreground';
  }
}

export function OpenIssuesSection({ issues }: OpenIssuesSectionProps) {
  // Section is hidden entirely if there are no open issues
  if (issues.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="heading-h3 text-foreground">Open Issues</h2>

      <div className="space-y-3">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="bg-card rounded-lg border border-border p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {issue.assetKind && (
                  <p className="text-xs text-muted-foreground system-name">
                    {issue.assetKind}
                  </p>
                )}
                <p className="text-sm font-medium text-foreground">
                  {issue.title}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {issue.status === 'in_progress' ? 'In progress' : 'Open'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Reported: {format(parseISO(issue.createdAt), 'MMM d, yyyy')}
              </span>
              <span className={severityColor(issue.severity)}>
                Severity: {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
              </span>
            </div>

            {issue.linkedRecommendation && (
              <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
                <span className="font-medium">Recommended: </span>
                {issue.linkedRecommendation.title}
                {issue.linkedRecommendation.costEstimated && (
                  <span>
                    {' · '}Est.{' '}
                    {typeof issue.linkedRecommendation.costEstimated === 'object'
                      ? JSON.stringify(issue.linkedRecommendation.costEstimated)
                      : `$${issue.linkedRecommendation.costEstimated}`}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
