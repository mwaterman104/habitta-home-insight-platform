import { X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { IntentEvent } from "@/hooks/useHomeIntentEvents";

interface ChatDIYIntentCardProps {
  events: IntentEvent[];
  onDismiss: (eventId: string) => void;
  onViewSystem: (systemKey: string) => void;
}

const SYSTEM_LABELS: Record<string, string> = {
  hvac: 'HVAC',
  roof: 'Roof',
  water_heater: 'Water Heater',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  windows: 'Windows',
  insulation: 'Insulation',
  appliance: 'Appliance',
  diy_project: 'DIY Project',
};

const INTENT_LABELS: Record<string, string> = {
  repair: 'repair',
  replace: 'replacement',
  upgrade: 'upgrade',
  inspect: 'inspection',
  diy_project: 'DIY project',
};

function formatTimeAgo(createdAt: string): string {
  const now = new Date();
  const then = new Date(createdAt);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

function isDismissed(eventId: string): boolean {
  return localStorage.getItem(`habitta_intent_dismissed_${eventId}`) === 'true';
}

function dismissEvent(eventId: string) {
  localStorage.setItem(`habitta_intent_dismissed_${eventId}`, 'true');
}

export function ChatDIYIntentCard({ events, onDismiss, onViewSystem }: ChatDIYIntentCardProps) {
  const visibleEvents = events.filter(e => !isDismissed(e.id));

  if (visibleEvents.length === 0) return null;

  const handleDismiss = (eventId: string) => {
    dismissEvent(eventId);
    onDismiss(eventId);
  };

  return (
    <Card className="border border-border/60 bg-card shadow-none mb-4">
      <CardHeader className="pb-2 pt-4 px-4">
        <p className="text-sm font-medium text-foreground">From your ChatDIY conversation</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {visibleEvents.map(event => {
          const systemLabel = SYSTEM_LABELS[event.system_type] || event.system_type.replace(/_/g, ' ');
          const intentLabel = INTENT_LABELS[event.intent_category] || event.intent_category;

          return (
            <div
              key={event.id}
              className="flex items-start justify-between gap-3 py-2 border-t border-border/40 first:border-t-0 first:pt-0"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-foreground">
                    {systemLabel} — {intentLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(event.created_at)}
                  </span>
                </div>
                {event.symptom_summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {event.symptom_summary}
                  </p>
                )}
                {event.severity === 'urgent' && (
                  <p className="text-xs text-muted-foreground">
                    You mentioned this was urgent.
                  </p>
                )}
                {event.pro_flag && (
                  <p className="text-xs text-muted-foreground">
                    You were considering professional help.
                  </p>
                )}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                  onClick={() => onViewSystem(event.system_type)}
                >
                  View {systemLabel}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleDismiss(event.id)}
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
