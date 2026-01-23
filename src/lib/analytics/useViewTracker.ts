import { useEffect, useRef } from 'react';
import { track } from './index';
import type { EventContext } from './types';

interface UseViewTrackerOptions {
  eventName: string;
  properties: Record<string, unknown>;
  context?: Partial<Omit<EventContext, 'session_id'>>;
  threshold?: number; // ms before firing (default 300)
  enabled?: boolean; // conditional tracking
}

/**
 * useViewTracker - Track component visibility
 * 
 * Uses IntersectionObserver with debounce to track when
 * a component enters the viewport.
 * 
 * Features:
 * - Dedup: fires once per session per component
 * - Threshold: configurable delay before firing
 * - 50% visibility required
 */
export function useViewTracker(
  ref: React.RefObject<HTMLElement>,
  options: UseViewTrackerOptions
): void {
  const hasFired = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasFired.current) return;
    if (options.enabled === false) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        
        if (entry.isIntersecting && !hasFired.current) {
          // Clear any existing timeout
          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
          }
          
          // Debounce: only fire if visible for threshold ms
          timeoutRef.current = window.setTimeout(() => {
            if (hasFired.current) return;
            hasFired.current = true;
            track(options.eventName, options.properties, options.context);
          }, options.threshold ?? 300);
        } else if (!entry.isIntersecting && timeoutRef.current) {
          // Cancel if element leaves viewport before threshold
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [options.eventName, options.enabled]);
}
