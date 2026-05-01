import { useRef, useState, useCallback } from 'react';

export type QueuedMessage = {
  id: string;
  content: string;
  timestamp: number;
};

const MAX_QUEUE_SIZE = 3;

export function useChatQueue() {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [inFlight, setInFlight] = useState<QueuedMessage | null>(null);

  const enqueue = useCallback((content: string): { queued: boolean; position: number } => {
    if (queue.length >= MAX_QUEUE_SIZE) {
      return { queued: false, position: -1 };
    }

    const message: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      timestamp: Date.now()
    };

    setQueue(prev => [...prev, message]);
    return { queued: true, position: queue.length };
  }, [queue.length]);

  const dequeue = useCallback((): QueuedMessage | null => {
    if (inFlight) {
      return null; // Already processing
    }

    if (queue.length === 0) {
      return null;
    }

    const [next, ...rest] = queue;
    setQueue(rest);
    setInFlight(next);
    return next;
  }, [queue, inFlight]);

  const complete = useCallback(() => {
    setInFlight(null);
    // Auto-dequeue next if available
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setInFlight(next);
      return next;
    }
    return null;
  }, [queue]);

  const clear = useCallback(() => {
    setQueue([]);
    setInFlight(null);
  }, []);

  return {
    queue,
    inFlight,
    queueSize: queue.length,
    hasInFlight: !!inFlight,
    enqueue,
    dequeue,
    complete,
    clear
  };
}

