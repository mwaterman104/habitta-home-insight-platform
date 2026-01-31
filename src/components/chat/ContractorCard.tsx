/**
 * ContractorCard - Individual contractor discovery card
 * 
 * Visual structure:
 * ┌─────────────────────────────────────────────┐
 * │ 🔧 Evergreen Plumbing Solutions             │
 * │ ⭐ 4.9 · 127 Google reviews                 │
 * │ Listed as: Plumber                          │
 * │ Near 1234 Main St                           │
 * └─────────────────────────────────────────────┘
 * 
 * TRUST DOCTRINE: This is a discovery aid, not endorsement.
 * - No "Recommended" / "Best" / "Top" language
 * - No "Specialist" / "Expert" inference
 * - Category is descriptive only ("Listed as")
 */

import { Wrench, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContractorRecommendation } from '@/lib/chatFormatting';

interface ContractorCardProps extends ContractorRecommendation {
  className?: string;
}

export function ContractorCard({
  name,
  rating,
  reviewCount,
  category,
  location,
  className,
}: ContractorCardProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow',
        className
      )}
    >
      {/* Header: Icon + Name */}
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
        <h4 className="font-semibold text-foreground text-sm leading-tight truncate">
          {name}
        </h4>
      </div>
      
      {/* Rating line: ⭐ 4.9 · 127 Google reviews */}
      <div className="flex items-center gap-1 mb-2">
        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
        <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">
          · {reviewCount} Google reviews
        </span>
      </div>
      
      {/* Category line: Listed as: Plumber */}
      <div className="mb-2 text-sm">
        <span className="text-muted-foreground">Listed as: </span>
        <span className="text-foreground">{category}</span>
      </div>
      
      {/* Location line */}
      {location && (
        <p className="text-sm text-muted-foreground">
          Near {location}
        </p>
      )}
    </div>
  );
}
