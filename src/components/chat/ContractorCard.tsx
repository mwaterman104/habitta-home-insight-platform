/**
 * ContractorCard - Individual contractor recommendation card
 * 
 * Visual structure:
 * ┌─────────────────────────────────────────────┐
 * │ 🔧 Evergreen Plumbing Solutions      [✓]   │
 * │ ★★★★★ 4.9/5                                │
 * │ Specialty: Tankless & High-Efficiency       │
 * │                                             │
 * │ Known for clean installations and helpful   │
 * │ rebate filing.                              │
 * └─────────────────────────────────────────────┘
 */

import { Wrench, BadgeCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContractorRecommendation } from '@/lib/chatFormatting';

interface ContractorCardProps extends ContractorRecommendation {
  className?: string;
}

export function ContractorCard({
  name,
  rating,
  specialty,
  notes,
  licenseVerified,
  className,
}: ContractorCardProps) {
  // Generate star display (filled stars based on rating)
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow',
        className
      )}
    >
      {/* Header: Icon + Name + Verified Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
          <h4 className="font-semibold text-foreground text-sm leading-tight truncate">
            {name}
          </h4>
        </div>
        {licenseVerified && (
          <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" aria-label="License Verified" />
        )}
      </div>
      
      {/* Rating */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center" aria-label={`Rating: ${rating} out of 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-3.5 w-3.5',
                i < fullStars
                  ? 'fill-amber-500 text-amber-500'
                  : i === fullStars && hasHalfStar
                    ? 'fill-amber-500/50 text-amber-500'
                    : 'fill-muted text-muted'
              )}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {rating}/5
        </span>
      </div>
      
      {/* Specialty */}
      <div className="mb-3 text-sm">
        <span className="text-muted-foreground font-medium">Specialty: </span>
        <span className="text-foreground">{specialty}</span>
      </div>
      
      {/* Notes */}
      {notes && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {notes}
        </p>
      )}
    </div>
  );
}
