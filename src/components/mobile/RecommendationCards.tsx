/**
 * RecommendationCards — Actionable confidence-building recommendations
 * 
 * Max 3 cards. Each shows title, rationale, confidence delta, and dismiss.
 * Tapping navigates to the action route.
 * No urgency, no red, no scare language.
 */

import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { Recommendation } from '@/services/recommendationEngine';
import { RECOMMENDATION_COPY } from '@/lib/mobileCopy';

interface RecommendationCardsProps {
  recommendations: Recommendation[];
  onDismiss: (id: string) => void;
}

export function RecommendationCards({ recommendations, onDismiss }: RecommendationCardsProps) {
  const navigate = useNavigate();

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">
        {RECOMMENDATION_COPY.sectionHeader}
      </h3>

      <div className="space-y-2">
        {recommendations.map((rec) => (
          <button
            key={rec.id}
            className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 relative group"
            onClick={() => navigate(rec.route)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {rec.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rec.rationale}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Confidence delta badge */}
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  +{rec.confidenceDelta}
                </span>

                {/* Dismiss button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(rec.id);
                  }}
                  className="p-1 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Dismiss recommendation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
