/**
 * SectionLabel - Styled section label with left accent bar
 * 
 * Visual:
 * ┃ What this means for you:
 * 
 * Uses a 3px blue accent bar on the left.
 */

import { cn } from '@/lib/utils';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  /** Semantic role for future governance integration */
  semanticRole?: 'implication' | 'evidence' | 'recommendation';
}

export function SectionLabel({
  children,
  className,
  semanticRole,
}: SectionLabelProps) {
  return (
    <span
      className={cn(
        'block font-semibold text-foreground text-sm',
        'pl-3 border-l-[3px] border-primary',
        'my-3',
        semanticRole === 'evidence' && 'border-emerald-600',
        semanticRole === 'recommendation' && 'border-amber-500',
        className
      )}
    >
      {children}
    </span>
  );
}
