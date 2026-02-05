/**
 * HomeEventConfirmation - Subtle confirmation card for home record events
 * 
 * Part of the Home Record (Carfax for the Home) system.
 * Quiet bookkeeping — not a loud alert.
 */

import { CheckCircle2, Plus, FileText } from 'lucide-react';
import type { HomeEventData } from '@/lib/chatFormatting';

interface HomeEventConfirmationProps {
  event: HomeEventData;
}

export function HomeEventConfirmation({ event }: HomeEventConfirmationProps) {
  if (!event.success || !event.message) return null;

  const icon = event.isNewAsset ? Plus : event.eventType === 'status_change' ? FileText : CheckCircle2;
  const Icon = icon;

  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/50">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        {event.message}
      </p>
    </div>
  );
}
