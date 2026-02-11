/**
 * FocusStateContext - Stack-based navigation store for the right column surface.
 * 
 * Rules:
 * - setFocus(next, { push: true }) pushes onto stack (user click)
 * - setFocus(next) replaces top (AI referencing same entity)
 * - goBack() pops stack
 * - clearFocus() resets to [null]
 * - User lock: 10s after push, prevents AI override
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import type { FocusState } from "@/types/focusState";

const USER_LOCK_DURATION_MS = 10_000;

interface FocusStateValue {
  focus: FocusState;
  focusStack: FocusState[];
  setFocus: (next: FocusState, opts?: { push?: boolean }) => void;
  goBack: () => void;
  clearFocus: () => void;
  isUserLocked: boolean;
}

const FocusStateContext = createContext<FocusStateValue | null>(null);

export function FocusStateProvider({ children }: { children: ReactNode }) {
  const [focusStack, setFocusStack] = useState<FocusState[]>([null]);
  const [isUserLocked, setIsUserLocked] = useState(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup lock timer on unmount
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  const activateLock = useCallback(() => {
    setIsUserLocked(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsUserLocked(false);
      lockTimerRef.current = null;
    }, USER_LOCK_DURATION_MS);
  }, []);

  const setFocus = useCallback((next: FocusState, opts?: { push?: boolean }) => {
    const shouldPush = opts?.push ?? false;

    setFocusStack(prev => {
      if (shouldPush) {
        return [...prev, next];
      }
      // Replace top
      if (prev.length <= 1) return [next];
      return [...prev.slice(0, -1), next];
    });

    if (shouldPush) {
      activateLock();
    }
  }, [activateLock]);

  const goBack = useCallback(() => {
    setFocusStack(prev => {
      if (prev.length <= 1) return [null];
      return prev.slice(0, -1);
    });
  }, []);

  const clearFocus = useCallback(() => {
    setFocusStack([null]);
    setIsUserLocked(false);
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const focus = focusStack[focusStack.length - 1] ?? null;

  return (
    <FocusStateContext.Provider value={{ focus, focusStack, setFocus, goBack, clearFocus, isUserLocked }}>
      {children}
    </FocusStateContext.Provider>
  );
}

/**
 * useFocusState - Consume focus state.
 * Returns no-op fallback when outside provider (mobile).
 */
export function useFocusState(): FocusStateValue {
  const ctx = useContext(FocusStateContext);
  if (ctx) return ctx;

  // No-op fallback for mobile (no provider)
  return {
    focus: null,
    focusStack: [null],
    setFocus: () => {},
    goBack: () => {},
    clearFocus: () => {},
    isUserLocked: false,
  };
}
