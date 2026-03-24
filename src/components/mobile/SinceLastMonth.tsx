/**
 * SinceLastMonth — Change awareness section
 * 
 * v1: Static. No historical delta system exists.
 * Following credibility stewardship doctrine:
 * - Shows honest default when no changes detected
 * - Max 2 items when delta data is available (future)
 * - No urgency, no red, no alerting
 * 
 * FUTURE PLUG POINT:
 * When a delta comparison service exists, this component will accept
 * an array of ChangeItem[] and render up to 2 neutral change lines
 * with ↑ / ↓ arrows. Until then, static is honest.
 */

import {
  SINCE_LAST_MONTH_HEADER,
  SINCE_LAST_MONTH_EMPTY,
} from '@/lib/mobileCopy';

export function SinceLastMonth() {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium text-foreground">
        {SINCE_LAST_MONTH_HEADER}
      </h3>
      <p className="text-sm text-muted-foreground">
        {SINCE_LAST_MONTH_EMPTY}
      </p>
    </div>
  );
}
