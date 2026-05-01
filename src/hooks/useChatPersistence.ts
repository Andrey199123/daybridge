import { useState, useCallback } from 'react';
import { readLocalStorage, removeLocalStorage, safeJsonParse, writeLocalStorage } from "../lib/browser";

export type PersistedChatState = {
  messages: Array<{ role: string; content: string; timestamp: number }>;
  smartSummary: {
    specific?: string;
    measurable?: string;
    achievable?: string;
    relevant?: string;
    timeBound?: string;
    category?: string;
    priority?: string;
    deadline?: string;
  };
  isChatComplete: boolean;
  lastUpdated: number;
};

const STORAGE_KEY = 'arc_smart_chat_state';

export function useChatPersistence(sessionId: string) {
  const storageKey = `${STORAGE_KEY}_${sessionId}`;

  const [persistedState, setPersistedState] = useState<PersistedChatState | null>(() => {
    const stored = readLocalStorage(storageKey);
    if (stored) {
      const parsed = safeJsonParse<PersistedChatState | null>(stored, null);
      if (parsed) {
        if (import.meta.env.DEV) {
          console.log('[Persistence] Restored chat state from localStorage', {
            messageCount: parsed.messages?.length || 0,
            complete: parsed.isChatComplete
          });
        }
        return parsed;
      }

      removeLocalStorage(storageKey);
    }
    return null;
  });

  const saveState = useCallback((state: PersistedChatState) => {
    const stateWithTimestamp = {
      ...state,
      lastUpdated: Date.now()
    };

    try {
      writeLocalStorage(storageKey, JSON.stringify(stateWithTimestamp));
      setPersistedState(stateWithTimestamp);
      if (import.meta.env.DEV) {
        console.log('[Persistence] Saved chat state', {
          messageCount: state.messages.length,
          complete: state.isChatComplete
        });
      }
    } catch (e) {
      console.error('[Persistence] Failed to save state:', e);
    }
  }, [storageKey]);

  const clearState = useCallback(() => {
    try {
      removeLocalStorage(storageKey);
      setPersistedState(null);
      if (import.meta.env.DEV) {
        console.log('[Persistence] Cleared chat state');
      }
    } catch (e) {
      console.error('[Persistence] Failed to clear state:', e);
    }
  }, [storageKey]);

  return {
    persistedState,
    saveState,
    clearState,
    hasPersistedState: !!persistedState
  };
}
