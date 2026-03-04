import { useState, useEffect, useRef, useCallback } from "react";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_MS = 8 * 60 * 1000;  // Show warning at 8 minutes (2 min before logout)
const CHECK_INTERVAL_MS = 1000;     // Check every second for accurate countdown

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
] as const;

interface UseIdleTimeoutOptions {
  onTimeout: () => void;
  enabled: boolean;
}

export function useIdleTimeout({ onTimeout, enabled }: UseIdleTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const lastActivityRef = useRef(Date.now());
  const onTimeoutRef = useRef(onTimeout);
  const hasTimedOutRef = useRef(false);

  // Keep callback ref current without triggering effect re-runs
  onTimeoutRef.current = onTimeout;

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    hasTimedOutRef.current = false;
  }, []);

  const dismiss = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      setShowWarning(false);
      hasTimedOutRef.current = false;
      return;
    }

    // Reset on mount / when enabled changes
    lastActivityRef.current = Date.now();
    hasTimedOutRef.current = false;

    const handleActivity = () => {
      // Only reset if warning is not showing — once warning is visible,
      // user must explicitly click "Stay Logged In"
      if (!hasTimedOutRef.current) {
        lastActivityRef.current = Date.now();
      }
    };

    // Attach activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check interval
    const intervalId = setInterval(() => {
      if (hasTimedOutRef.current) return;

      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= TIMEOUT_MS) {
        hasTimedOutRef.current = true;
        setShowWarning(false);
        onTimeoutRef.current();
      } else if (elapsed >= WARNING_MS) {
        const secsLeft = Math.ceil((TIMEOUT_MS - elapsed) / 1000);
        setRemainingSeconds(secsLeft);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(intervalId);
    };
  }, [enabled]);

  return { showWarning, remainingSeconds, dismiss };
}
