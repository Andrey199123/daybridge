import { useState, useEffect, useCallback, useRef } from 'react';
import { getNavigatorOnline } from "../lib/browser";

export function useConnectivityGuard() {
  const [isOnline, setIsOnline] = useState(getNavigatorOnline);
  const [justReconnected, setJustReconnected] = useState(false);
  const wasOffline = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      if (wasOffline.current) {
        setJustReconnected(true);
        wasOffline.current = false;

        if (reconnectTimeoutRef.current !== null) {
          window.clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = window.setTimeout(() => {
          setJustReconnected(false);
          reconnectTimeoutRef.current = null;
        }, 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const clearReconnectedFlag = useCallback(() => {
    setJustReconnected(false);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    justReconnected,
    clearReconnectedFlag
  };
}
