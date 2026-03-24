/**
 * BulletList - Formatted bullet list component
 * 
 * Styling:
 * - Blue bullet accent color
 * - Proper indentation
 * - Line height 1.6
 */

import { cn } from '@/lib/utils';

interface BulletListProps {
  items: string[];
  className?: string;
}

export function BulletList({ items, className }: BulletListProps) {
  if (!items || items.length === 0) {
    return null;
  }
  
  return (
    <ul className={cn('list-none pl-0 my-2 space-y-1.5', className)}>
      {items.map((item, index) => (
        <li
          key={index}
          className="relative pl-5 text-sm text-foreground leading-relaxed"
        >
          <span
            className="absolute left-0 top-0 text-primary font-semibold"
            aria-hidden="true"
          >
            •
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
