import { useState, useCallback, useRef, useEffect } from 'react';

const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const OPEN_DURATION_MS = 60 * 1000; // 60 seconds

type FailureRecord = {
  timestamp: number;
  error: string;
};

export function useCircuitBreaker() {
  const [state, setState] = useState<'closed' | 'open' | 'half-open'>('closed');
  const [openUntil, setOpenUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const failures = useRef<FailureRecord[]>([]);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  const recordFailure = useCallback((error: string) => {
    const now = Date.now();
    const recentWindow = now - FAILURE_WINDOW_MS;

    // Remove old failures outside the window
    failures.current = failures.current.filter(f => f.timestamp > recentWindow);

    // Add new failure
    failures.current.push({ timestamp: now, error });

    console.log(`[Circuit Breaker] Failure recorded. Recent failures: ${failures.current.length}/${FAILURE_THRESHOLD}`);

    // Check if we should open the breaker
    if (failures.current.length >= FAILURE_THRESHOLD && state !== 'open') {
      const openUntilTime = now + OPEN_DURATION_MS;
      setOpenUntil(openUntilTime);
      setState('open');
      setRemainingSeconds(Math.ceil(OPEN_DURATION_MS / 1000));

      console.log(`[Circuit Breaker] OPENED due to ${failures.current.length} failures. Cooldown: 60s`);

      // Start countdown
      countdownInterval.current = setInterval(() => {
        const remaining = Math.ceil((openUntilTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setState('half-open');
          setRemainingSeconds(0);
          setOpenUntil(null);
          if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
            countdownInterval.current = null;
          }
          console.log('[Circuit Breaker] Moved to HALF-OPEN, ready to retry');
        } else {
          setRemainingSeconds(remaining);
        }
      }, 1000);
    }
  }, [state]);

  const recordSuccess = useCallback(() => {
    if (state === 'half-open') {
      console.log('[Circuit Breaker] Success in half-open, closing breaker');
      setState('closed');
      failures.current = [];
    }
    // Clear old failures even in closed state
    const now = Date.now();
    const recentWindow = now - FAILURE_WINDOW_MS;
    failures.current = failures.current.filter(f => f.timestamp > recentWindow);
  }, [state]);

  const reset = useCallback(() => {
    console.log('[Circuit Breaker] Manual reset');
    setState('closed');
    failures.current = [];
    setOpenUntil(null);
    setRemainingSeconds(0);
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
  }, []);

  const forceClose = useCallback(() => {
    console.log('[Circuit Breaker] Force closed by user');
    setState('half-open'); // Go to half-open to allow one attempt
    setOpenUntil(null);
    setRemainingSeconds(0);
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
  }, []);

  return {
    state,
    isOpen: state === 'open',
    isClosed: state === 'closed',
    isHalfOpen: state === 'half-open',
    remainingSeconds,
    failureCount: failures.current.length,
    recordFailure,
    recordSuccess,
    reset,
    forceClose
  };
}

