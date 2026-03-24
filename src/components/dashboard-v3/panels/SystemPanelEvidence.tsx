/**
 * SystemPanelEvidence - Evidence cards list.
 * Shows permits, records, uploads, assumptions that build confidence.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Upload, HelpCircle } from "lucide-react";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";

interface SystemPanelEvidenceProps {
  system?: SystemTimelineEntry;
}

interface EvidenceCard {
  icon: React.ReactNode;
  title: string;
  date?: string;
  impact: 'high' | 'medium' | 'low';
  source: string;
}

function deriveEvidenceCards(system?: SystemTimelineEntry): EvidenceCard[] {
  if (!system) return [];
  const cards: EvidenceCard[] = [];

  // Install source evidence
  if (system.installSource === 'permit') {
    cards.push({
      icon: <Shield className="h-4 w-4 text-green-600" />,
      title: 'Permit-verified installation',
      date: system.installYear ? `${system.installYear}` : undefined,
      impact: 'high',
      source: 'permit',
    });
  } else if (system.installSource === 'inferred') {
    cards.push({
      icon: <HelpCircle className="h-4 w-4 text-yellow-600" />,
      title: 'Installation date inferred',
      date: system.installYear ? `~${system.installYear}` : undefined,
      impact: 'low',
      source: 'inference',
    });
  }

  // Material type evidence
  if (system.materialType && system.materialSource) {
    cards.push({
      icon: <FileText className="h-4 w-4 text-primary" />,
      title: `Material: ${system.materialType}`,
      impact: system.materialSource === 'permit' ? 'high' : 'medium',
      source: system.materialSource,
    });
  }

  // Climate zone evidence
  if (system.climateZone) {
    cards.push({
      icon: <FileText className="h-4 w-4 text-muted-foreground" />,
      title: `Climate zone: ${system.climateZone}`,
      impact: 'medium',
      source: 'derived',
    });
  }

  // If no evidence at all, show assumption card
  if (cards.length === 0) {
    cards.push({
      icon: <Upload className="h-4 w-4 text-muted-foreground" />,
      title: 'No supporting records found',
      impact: 'low',
      source: 'assumption',
    });
  }

  return cards;
}

const impactColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-muted text-muted-foreground',
};

export function SystemPanelEvidence({ system }: SystemPanelEvidenceProps) {
  const cards = deriveEvidenceCards(system);
  const highCount = cards.filter(c => c.impact === 'high').length;
  const totalCount = cards.length;

  return (
    <div className="space-y-4 pt-2">
      {/* Summary */}
      <p className="text-xs text-muted-foreground">
        Confidence derived from {totalCount} supporting record{totalCount !== 1 ? 's' : ''}.
        {highCount > 0 && ` ${highCount} high-impact.`}
      </p>

      {/* Evidence cards */}
      <div className="space-y-2">
        {cards.map((card, i) => (
          <Card key={i} className="border bg-muted/20">
            <CardContent className="py-3 px-4 flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{card.icon}</div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">{card.title}</p>
                {card.date && (
                  <p className="text-xs text-muted-foreground">{card.date}</p>
                )}
              </div>
              <Badge className={`shrink-0 text-[10px] ${impactColors[card.impact]}`}>
                {card.impact}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
