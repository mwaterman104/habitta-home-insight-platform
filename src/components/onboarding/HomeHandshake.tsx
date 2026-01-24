/**
 * HomeHandshake
 * 
 * The soul of onboarding — demonstrates asymmetric effort.
 * Full-screen system acknowledgment. No buttons. 4-6 seconds.
 * 
 * "Nice to meet your home."
 */

import { useState, useEffect, useCallback } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';

// Timing constants (Risk 1 Fix: Soft exit condition)
const STEP_INTERVAL = 1500; // 1.5s per step
const MINIMUM_DISPLAY = 4000; // 4s minimum (was rigid 6s)

interface HomeHandshakeProps {
  city: string;
  state: string;
  isFirstHome: boolean; // For headline branching (Risk 6 Fix)
  onComplete: () => void;
}

const SCAN_ITEMS = [
  'Pulling public property records',
  'Analyzing climate stress',
  'Matching similar homes nearby',
  'Estimating system lifecycles',
];

function ScanItem({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-300",
        completed ? "bg-primary" : "bg-muted"
      )}>
        {completed ? (
          <Check className="h-3 w-3 text-primary-foreground" />
        ) : (
          <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
        )}
      </div>
      <span className={cn(
        "text-sm transition-colors duration-300",
        completed ? "text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}

export function HomeHandshake({ city, state, isFirstHome, onComplete }: HomeHandshakeProps) {
  const [completedSteps, setCompletedSteps] = useState(0);
  const [startTime] = useState(Date.now());
  const [canAdvance, setCanAdvance] = useState(false);

  // Memoize onComplete to prevent re-triggers
  const stableOnComplete = useCallback(onComplete, []);

  // Sequential step completion
  useEffect(() => {
    if (completedSteps < SCAN_ITEMS.length) {
      const timer = setTimeout(() => {
        setCompletedSteps(prev => prev + 1);
      }, STEP_INTERVAL);
      return () => clearTimeout(timer);
    }
  }, [completedSteps]);

  // Check if can advance (all steps done + minimum time elapsed)
  useEffect(() => {
    if (completedSteps === SCAN_ITEMS.length) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= MINIMUM_DISPLAY) {
        setCanAdvance(true);
      } else {
        const remaining = MINIMUM_DISPLAY - elapsed;
        const timer = setTimeout(() => setCanAdvance(true), remaining);
        return () => clearTimeout(timer);
      }
    }
  }, [completedSteps, startTime]);

  // Auto-advance when ready
  useEffect(() => {
    if (canAdvance) {
      stableOnComplete();
    }
  }, [canAdvance, stableOnComplete]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo with subtle animation */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-primary/10 animate-pulse">
            <Logo className="h-12 w-12" />
          </div>
        </div>
        
        {/* Headline with branching (Risk 6) */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            {isFirstHome 
              ? "Nice to meet your home."
              : "Let's get this home under watch."}
          </h1>
          <p className="text-muted-foreground">
            We're building its baseline using everything we can find.
          </p>
        </div>

        {/* Scan items with sequential completion */}
        <div className="space-y-3 text-left max-w-xs mx-auto">
          {SCAN_ITEMS.map((label, index) => (
            <ScanItem 
              key={label} 
              label={label} 
              completed={completedSteps > index} 
            />
          ))}
        </div>

        {/* Reassuring footer */}
        <p className="text-xs text-muted-foreground">
          You can refine this later. We'll start with our best estimate.
        </p>
      </div>
    </div>
  );
}
