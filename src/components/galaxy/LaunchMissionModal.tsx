import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GoalsService, AIService, MilestonesService } from '../../services';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, Sparkles, Send, Check, Edit2, X, AlertCircle, 
  ChevronDown, ChevronUp, Wifi, WifiOff, PlayCircle, Activity 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatQueue } from "../../hooks/useChatQueue";
import { useCircuitBreaker } from "../../hooks/useCircuitBreaker";
import { useConnectivityGuard } from "../../hooks/useConnectivityGuard";
import { useChatPersistence } from "../../hooks/useChatPersistence";
import { ALLOWED_CATEGORIES, detectDisallowedIntent, type AllowedCategory } from "../../../convex/categoryPolicy";
import { toast } from "sonner";
import { SimpleDateInput } from "../SimpleDateInput";
import { MarkdownText } from "../MarkdownText";

// ═══════════════════════════════════════════════════════════════
// CATEGORY UI CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface CategoryOption {
  value: AllowedCategory;
  label: string;
  emoji: string;
  description: string;
}

const CATEGORY_UI: readonly CategoryOption[] = [
  { value: "academic", label: "Meds & Visits", emoji: "", description: "Medication reminders, appointments, paperwork" },
  { value: "career", label: "Errands & Rides", emoji: "", description: "Transportation, shopping, pickup and dropoff plans" },
  { value: "creative", label: "Connection", emoji: "", description: "Calls, hobbies, family time, community events" },
  { value: "entrepreneurial", label: "Care Circle", emoji: "", description: "Shared support from family, neighbors, aides, volunteers" },
  { value: "personal-growth", label: "Wellbeing", emoji: "", description: "Meals, movement reminders, home routines, independence" }
] as const;

interface ValidationError {
  field: "category" | "priority" | "title" | "deadline";
  message: string;
  isDisallowedCategory?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  turnId?: string;
  isError?: boolean;
}

interface SMARTSummary {
  specific?: string;
  measurable?: string;
  achievable?: string;
  relevant?: string;
  timeBound?: string;
  category?: string;
  priority?: string;
  deadline?: string;
}

// SMART state machine
type SMARTSlot = "SPECIFIC" | "MEASURABLE" | "ACHIEVABLE" | "RELEVANT" | "TIME_BOUND";

interface SMARTSlotConfig {
  key: SMARTSlot;
  label: string;
  summaryKey: keyof SMARTSummary;
  prompt: string;
  example: string;
  validator: (value: string | undefined) => boolean;
  order: number;
}

const SMART_SLOTS: Record<SMARTSlot, SMARTSlotConfig> = {
  SPECIFIC: {
    key: "SPECIFIC",
    label: "Specific",
    summaryKey: "specific",
    prompt: "What exactly will you accomplish? Be specific.",
    example: "Prepare for Thursday's clinic visit",
    validator: (v) => !!v && v.trim().length > 5,
    order: 0
  },
  MEASURABLE: {
    key: "MEASURABLE",
    label: "Measurable",
    summaryKey: "measurable",
    prompt: "How will you know this went well?",
    example: "Ride confirmed, paperwork packed, appointment completed",
    validator: (v) => !!v && v.trim().length > 5,
    order: 1
  },
  ACHIEVABLE: {
    key: "ACHIEVABLE",
    label: "Achievable",
    summaryKey: "achievable",
    prompt: "Who can help, and what time or tools are available?",
    example: "Daughter can call at noon; ride service is already booked",
    validator: (v) => !!v && v.trim().length > 5,
    order: 2
  },
  RELEVANT: {
    key: "RELEVANT",
    label: "Relevant",
    summaryKey: "relevant",
    prompt: "Why does this matter for independence or peace of mind?",
    example: "Avoids a rushed morning and lets me handle the visit confidently",
    validator: (v) => !!v && v.trim().length > 5,
    order: 3
  },
  TIME_BOUND: {
    key: "TIME_BOUND",
    label: "Time-bound",
    summaryKey: "timeBound",
    prompt: "When do you want to complete this? Give a target date.",
    example: "By March 31, 2025",
    validator: (v) => !!v && v.trim().length > 5,
    order: 4
  }
};

type FlowStep = "initial" | "chat" | "confirm" | "preview" | "creating";

type RequestState = "idle" | "typing" | "sending" | "waiting" | "success" | "error";

type ErrorKind = "timeout" | "rate_limit" | "auth_error" | "server_error" | "network" | "abort" | "unknown";

interface TurnTrace {
  turnId: string;
  startedAt: number;
  state: RequestState;
  duration?: number;
  errorKind?: ErrorKind;
  retryAttempt?: number;
}

export function LaunchMissionModal({ onClose, onSuccess }) {
  // Session ID for persistence and request ID for correlation
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`).current;
  const requestIdRef = useRef<string>(`req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Flow state
  const [step, setStep] = useState<FlowStep>("initial");
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    deadline: "",
    priority: "medium",
    description: ""
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showCategoryWarning, setShowCategoryWarning] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [smartSummary, setSmartSummary] = useState<SMARTSummary>({});
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [isChatComplete, setIsChatComplete] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(true);
  const [selectedChipIndex, setSelectedChipIndex] = useState<number>(-1);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // SMART state machine
  const [currentSlot, setCurrentSlot] = useState<SMARTSlot>("SPECIFIC");
  const [completedSlots, setCompletedSlots] = useState<Set<SMARTSlot>>(new Set());

  // Request state
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [currentTurn, setCurrentTurn] = useState<TurnTrace | null>(null);
  const [turnHistory, setTurnHistory] = useState<TurnTrace[]>([]);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{ kind: string; message: string; requestId: string } | null>(null);

  // Streaming state
  const [streamingResponse, setStreamingResponse] = useState("");
  const abortController = useRef<AbortController | null>(null);

  // Timeouts and refs
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const idempotencyKeyRef = useRef<string>(`goal-${Date.now()}-${Math.random()}`);

  // Hooks
  const chatQueue = useChatQueue();
  const circuitBreaker = useCircuitBreaker();
  const connectivity = useConnectivityGuard();
  const persistence = useChatPersistence(sessionId);
  
  // Health check (temporarily disabled - will work after Convex restart)
  // const aiHealth = useQuery(api.ai.aiHealthCheck) || { healthy: true, hasKey: true, message: "Checking..." };
  const aiHealth = { healthy: true, hasKey: true, message: "Health check will be enabled after Convex restart" };
  const isAIHealthy = aiHealth?.healthy ?? true;
  const hasAPIKey = true; // API key is configured in Convex backend

  // Actions
  const smartChat = AIService.useSMARTGoalChat();
  const createGoalWithAI = GoalsService.useCreateWithAI();

  // Constants
  const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
  const MAX_RETRIES = 2;
  const DEBOUNCE_MS = 300;

  // SMART state machine helpers
  const getSlotConfig = (slot: SMARTSlot): SMARTSlotConfig => SMART_SLOTS[slot];
  
  // Debug helper for hanging requests
  const debugRequestState = useCallback(() => {
    console.log('[DEBUG] Current request state:', {
      requestState,
      isInFlight: isRequestInFlightRef.current,
      hasInFlight: chatQueue.hasInFlight,
      queueSize: chatQueue.queueSize,
      circuitOpen: circuitBreaker.isOpen,
      isOffline: connectivity.isOffline,
      messageCount: messages.length,
      currentSlot,
      isChatComplete
    });
  }, [requestState, chatQueue, circuitBreaker, connectivity, messages.length, currentSlot, isChatComplete]);
  
  const isSlotFilled = (slot: SMARTSlot): boolean => {
    const config = getSlotConfig(slot);
    const value = smartSummary[config.summaryKey];
    return config.validator(value);
  };
  
  const getNextSlot = (current: SMARTSlot): SMARTSlot | null => {
    const slots: SMARTSlot[] = ["SPECIFIC", "MEASURABLE", "ACHIEVABLE", "RELEVANT", "TIME_BOUND"];
    const currentIndex = slots.indexOf(current);
    return currentIndex < slots.length - 1 ? slots[currentIndex + 1] : null;
  };
  
  const getCompletionPercentage = (): number => {
    const totalSlots = 5;
    const filledCount = completedSlots.size;
    return Math.round((filledCount / totalSlots) * 100);
  };
  
  const transitionToNextSlot = () => {
    if (isSlotFilled(currentSlot)) {
      setCompletedSlots(prev => new Set(prev).add(currentSlot));
      const next = getNextSlot(currentSlot);
      if (next) {
        console.log(`[SMART] Transitioning: ${currentSlot} → ${next}`);
        setCurrentSlot(next);
      } else {
        console.log(`[SMART] All slots completed! Setting chat complete.`);
        setIsChatComplete(true);
      }
    }
  };

  // Restore persisted state on mount
  useEffect(() => {
    if (persistence.hasPersistedState && step === "initial") {
      const { messages: persistedMessages, smartSummary: persistedSummary, isChatComplete: persistedComplete } = persistence.persistedState!;
      
      if (persistedMessages.length > 0) {
        console.log('[Launch Modal] Restoring persisted chat state');
        setMessages(persistedMessages);
        setSmartSummary(persistedSummary);
        setIsChatComplete(persistedComplete);
        setStep("chat");
      }
    }
  }, []);

  // Persist state after each successful turn
  useEffect(() => {
    if (step === "chat" && messages.length > 0) {
      persistence.saveState({
        messages,
        smartSummary,
        isChatComplete,
        lastUpdated: Date.now()
      });
    }
  }, [messages, smartSummary, isChatComplete, step]);

  // Auto-retry on reconnection
  useEffect(() => {
    if (connectivity.justReconnected && lastFailedMessage && requestState === "error") {
      console.log('[Launch Modal] Auto-retrying after reconnection');
      connectivity.clearReconnectedFlag();
      handleRetry();
    }
  }, [connectivity.justReconnected]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, streamingResponse]);

  // Focus input when chat starts
  useEffect(() => {
    if (step === "chat" && inputRef.current && requestState === "idle") {
      inputRef.current.focus();
    }
  }, [step, requestState]);

  // Monitor SMART summary for completion (removed auto-transition logic)
  useEffect(() => {
    // Only mark as complete when AI explicitly says so
    if (step === "chat" && requestState === "idle" && !isChatComplete && messages.length > 0) {
      // Check if AI marked the conversation as complete
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage?.isComplete) {
        console.log(`[SMART] AI marked conversation as complete`);
        // Mark all filled slots as complete
        const allSlots: SMARTSlot[] = ["SPECIFIC", "MEASURABLE", "ACHIEVABLE", "RELEVANT", "TIME_BOUND"];
        const filled = allSlots.filter(slot => isSlotFilled(slot));
        setCompletedSlots(new Set(filled));
        setIsChatComplete(true);
      }
    }
  }, [smartSummary, messages, isChatComplete, requestState, step]);

  // Debug hanging requests
  useEffect(() => {
    if (requestState === "waiting") {
      const debugInterval = setInterval(() => {
        console.warn('[DEBUG] Request still waiting after extended time');
        debugRequestState();
      }, 10000); // Log every 10 seconds if still waiting
      
      return () => clearInterval(debugInterval);
    }
  }, [requestState, debugRequestState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Clear request flag on unmount
      isRequestInFlightRef.current = false;
    };
  }, []);

  // Trace a turn state change
  const traceTurn = useCallback((turnId: string, state: RequestState, errorKind?: ErrorKind) => {
    setCurrentTurn(prev => {
      const now = Date.now();
      const updated: TurnTrace = {
        turnId,
        startedAt: prev?.startedAt || now,
        state,
        duration: prev ? now - prev.startedAt : undefined,
        errorKind,
        retryAttempt
      };
      
      console.log(`[Turn ${turnId}] ${state.toUpperCase()}`, {
        duration: updated.duration,
        errorKind,
        retryAttempt
      });
      
      // Archive completed turns
      if (state === "success" || state === "error") {
        setTurnHistory(h => [...h, updated]);
      }
      
      return updated;
    });
  }, [retryAttempt]);

  // Classify error and return error kind
  const classifyError = useCallback((error: any): ErrorKind => {
    const msg = error?.message || error?.toString() || "";
    
    if (msg.includes("abort") || msg.includes("cancel")) {
      return "abort";
    } else if (msg.includes("RATE_LIMIT") || msg.includes("429")) {
      return "rate_limit";
    } else if (msg.includes("AUTH_ERROR") || msg.includes("401") || msg.includes("403")) {
      return "auth_error";
    } else if (msg.includes("SERVER_ERROR") || msg.includes("5")) {
      return "server_error";
    } else if (msg.includes("NETWORK_ERROR") || msg.includes("fetch") || msg.includes("network")) {
      return "network";
    } else if (msg.includes("timeout")) {
      return "timeout";
    }
    
    return "unknown";
  }, []);

  // Calculate backoff delay with jitter
  const getBackoffDelay = useCallback((attempt: number, errorKind: ErrorKind): number => {
    const baseDelay = errorKind === "rate_limit" ? 5000 : 2000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 15000); // Cap at 15s
  }, []);

  // Request deduplication - prevent duplicate requests
  const isRequestInFlightRef = useRef<boolean>(false);
  const lastRequestTimeRef = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 3000; // Minimum 3 seconds between requests
  
  // Send message to AI with full robustness
  const sendToAI = useCallback(async (userMessage: string, isRetry: boolean = false): Promise<boolean> => {
    console.log(`[Send] Starting sendToAI | Retry: ${isRetry} | Slot: ${currentSlot} | InFlight: ${isRequestInFlightRef.current}`);
    
    // CRITICAL: Only one request at a time
    if (isRequestInFlightRef.current) {
      console.warn(`[Send] ❌ BLOCKED: Request already in flight`);
      return false;
    }
    
    // CRITICAL: Prevent rapid-fire requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL && !isRetry) {
      console.warn(`[Send] ❌ BLOCKED: Too soon since last request (${timeSinceLastRequest}ms < ${MIN_REQUEST_INTERVAL}ms)`);
      return false;
    }
    
    // Mark request as in flight
    isRequestInFlightRef.current = true;
    lastRequestTimeRef.current = now;
    // Update last request time
    lastRequestTimeRef.current = now;
    // Guard checks
    if (!hasAPIKey) {
      console.error('[Send] ❌ BLOCKED: API key missing');
      return false;
    }
    
    if (!isAIHealthy) {
      console.error('[Send] ❌ BLOCKED: AI service unhealthy');
      return false;
    }
    
    if (connectivity.isOffline) {
      console.error('[Send] ❌ BLOCKED: Offline');
      return false;
    }
    
    if (circuitBreaker.isOpen) {
      console.error(`[Send] ❌ BLOCKED: Circuit breaker open (${circuitBreaker.remainingSeconds}s remaining)`);
      return false;
    }
    
    if (chatQueue.hasInFlight && !isRetry) {
      // Queue the message
      const result = chatQueue.enqueue(userMessage);
      if (result.queued) {
        console.log(`[Send] Message queued at position ${result.position}`);
        // Show toast
      } else {
        console.warn('[Send] Queue full, message rejected');
        // Show toast
      }
      return false;
    }
    
    // Mark this request as active
    // Request marked as in flight above;

    // Generate turn ID
    const turnId = `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Start trace
    traceTurn(turnId, "sending");
    setRequestState("sending");
    
    // Create abort controller
    abortController.current = new AbortController();
    
    // Set timeout
    requestTimeoutRef.current = setTimeout(() => {
      console.error(`[Turn ${turnId}] Frontend timeout after ${REQUEST_TIMEOUT_MS}ms`);
      console.error(`[Turn ${turnId}] Request state: ${requestState}, InFlight: ${isRequestInFlightRef.current}`);
      abortController.current?.abort();
      traceTurn(turnId, "error", "timeout");
      
      // Show timeout message to user
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "The request is taking longer than expected. This might be due to high server load. Please try again.",
        timestamp: Date.now(),
        turnId,
        isError: true
      }]);
      
      setRequestState("error");
      isRequestInFlightRef.current = false;
    }, REQUEST_TIMEOUT_MS);

    try {
      // Build message history
      const messageHistory = isRetry ? messages : [...messages, { role: "user" as const, content: userMessage, timestamp: Date.now(), turnId }];
      
      if (!isRetry) {
        setMessages(messageHistory);
      }
      
      traceTurn(turnId, "waiting");
      setRequestState("waiting");
      setStreamingResponse("");

      // Call backend (backend will generate requestId internally)
      console.log(`[CLIENT] Sending turn ${messages.length + 1} | Slot: ${currentSlot} (${getSlotConfig(currentSlot).order + 1}/5)`);
      console.log(`[CLIENT] Request payload:`, {
        messageCount: messageHistory.length,
        goalTitle: formData.name,
        currentSlot,
        isRetry
      });
      
      console.log(`[CLIENT] About to call smartChat...`);
      
      // Add a race condition to detect hanging smartChat calls
      const smartChatPromise = smartChat({
        messages: messageHistory.map(m => ({ role: m.role, content: m.content })),
        initialGoal: {
        title: formData.name,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
          targetDate: formData.deadline
        },
        currentSlot: currentSlot  // Pass current SMART slot for focused prompts
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('FRONTEND_TIMEOUT: smartChat call took longer than 50 seconds'));
        }, 50000); // Increased from 25s to 50s to match backend timeout
      });
      
      const result = await Promise.race([smartChatPromise, timeoutPromise]);
      
      console.log(`[CLIENT] smartChat returned successfully!`);
      console.log(`[CLIENT] Received: ${result.errorKind ? 'ERROR' : 'SUCCESS'} | Duration: ${result.duration || 0}ms`);
      console.log(`[CLIENT] Response details:`, {
        hasResponse: !!result.response,
        responseLength: result.response?.length || 0,
        hasSummary: !!result.smartSummary,
        isComplete: result.isComplete,
        errorKind: result.errorKind
      });
      console.log(`[CLIENT] Full result object:`, result);

      // Clear timeout
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }

      // Check if backend returned an error
      if (result.errorKind) {
        console.warn(`[CLIENT] Backend error: ${result.errorKind} | Message: ${result.response}`);
        
        // Store error for diagnostics
        setLastError({
          kind: result.errorKind,
          message: result.response,
          requestId: requestIdRef.current
        });
        
        // Don't retry user input errors or rate limits - show them immediately
        const nonRetryableErrors = ['AUTH_ERROR', 'INVALID_CATEGORY', 'RATE_LIMIT', 'TITLE_TOO_LONG'];
        
        // Retry if under limit and error is retryable
        if (retryAttempt < MAX_RETRIES && !nonRetryableErrors.includes(result.errorKind)) {
          const backoffDelay = getBackoffDelay(retryAttempt, result.errorKind);
          console.log(`[CLIENT] Auto-retry ${retryAttempt + 1}/${MAX_RETRIES} after ${backoffDelay}ms`);
          
          setRetryAttempt(prev => prev + 1);
          setRequestState("waiting");
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return sendToAI(userMessage, true);
        }
        
        // Max retries exceeded OR non-retryable error - show to user
        if (!nonRetryableErrors.includes(result.errorKind)) {
          console.error(`[CLIENT] Backend error after max retries, recording circuit breaker failure`);
          circuitBreaker.recordFailure(result.errorKind);
        } else {
          console.log(`[CLIENT] Non-retryable error (${result.errorKind}), showing to user immediately`);
        }
        
        setLastFailedMessage(userMessage);
        
        // Show error message to user
        setMessages(prev => [...prev, {
          role: "assistant",
          content: result.response,
          timestamp: Date.now(),
          turnId: result.turnId || turnId,
          isError: true
        }]);
        
        // Set quick replies for recovery
        setQuickReplies(result.quickReplies || ["Try again", "Continue anyway"]);
        
        setRequestState("error");
        setRetryAttempt(0);
        
        // Clear active request
        isRequestInFlightRef.current = false;
        
        chatQueue.complete();
        return false;
      }

      // Success path
      traceTurn(turnId, "success");
      setRequestState("success");
      
      // Update state
      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.response,
        timestamp: Date.now(),
        turnId: result.turnId || turnId
      }]);
      
      if (result.smartSummary) {
        setSmartSummary(prev => ({
          ...prev,
          ...result.smartSummary,
          // Preserve existing values if new ones are undefined/null
          specific: result.smartSummary.specific || prev.specific,
          measurable: result.smartSummary.measurable || prev.measurable,
          achievable: result.smartSummary.achievable || prev.achievable,
          relevant: result.smartSummary.relevant || prev.relevant,
          timeBound: result.smartSummary.timeBound || prev.timeBound,
          deadline: result.smartSummary.deadline || prev.deadline,
          category: result.smartSummary.category || prev.category,
          priority: result.smartSummary.priority || prev.priority
        }));
      }
      
      setIsChatComplete(result.isComplete || false);
      setQuickReplies(result.quickReplies || []);
      setStreamingResponse("");
      setLastFailedMessage(null);
      setRetryAttempt(0);
      setLastError(null); // Clear error on success
      
      // Record success in circuit breaker
      circuitBreaker.recordSuccess();
      
      // Clear active request
      isRequestInFlightRef.current = false;
      
      // Process queue
      setTimeout(() => {
        setRequestState("idle");
        const nextInQueue = chatQueue.complete();
        if (nextInQueue) {
          console.log('[Queue] Processing next message:', nextInQueue.content);
          sendToAI(nextInQueue.content, false);
        }
      }, 100);
      
      return true;
      
    } catch (error: any) {
      console.error(`[CLIENT] Exception caught in sendToAI:`, error);
      console.error(`[CLIENT] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
      
      // Clear timeout
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      
      const errorKind = classifyError(error);
      traceTurn(turnId, "error", errorKind);
      
      console.error(`[Turn ${turnId}] Failed:`, error.message, { errorKind, retryAttempt });
      
      // Handle abort separately
      if (errorKind === "abort") {
        setRequestState("idle");
        setStreamingResponse("");
        isRequestInFlightRef.current = false; // Clear active request
        chatQueue.complete(); // Clear in-flight
        return false;
      }
      
      // Store error for diagnostics
      setLastError({
        kind: errorKind,
        message: error.message,
        requestId: requestIdRef.current
      });
      
      // Handle auth errors (no retry, record as failure)
      if (errorKind === "auth_error") {
        console.error(`[Turn ${turnId}] Auth error - no retry`);
        setRequestState("error");
        circuitBreaker.recordFailure("auth_error");
        setLastFailedMessage(userMessage);
        isRequestInFlightRef.current = false; // Clear active request
        chatQueue.complete();
        return false;
      }
      
      // Retry logic for transient errors
      if (retryAttempt < MAX_RETRIES) {
        const backoffDelay = getBackoffDelay(retryAttempt, errorKind);
        console.log(`[Turn ${turnId}] Retry ${retryAttempt + 1}/${MAX_RETRIES} after ${backoffDelay}ms`);
        
        setRetryAttempt(prev => prev + 1);
        setRequestState("waiting");
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        
        return sendToAI(userMessage, true);
      }
      
      // Max retries exceeded - NOW record failure in circuit breaker
      console.error(`[Turn ${turnId}] Max retries exceeded, recording circuit breaker failure`);
      circuitBreaker.recordFailure(`${errorKind}: ${error.message}`);
      setLastFailedMessage(userMessage);
      setRequestState("error");
      setRetryAttempt(0);
      isRequestInFlightRef.current = false; // Clear active request
      chatQueue.complete(); // Clear in-flight
      
      return false;
    }
  }, [
    hasAPIKey, isAIHealthy, connectivity, circuitBreaker,
    messages, formData, smartChat, retryAttempt, chatQueue, currentSlot
  ]);

  // Handle user input
  const handleSendMessage = useCallback(async (messageOverride?: string) => {
    const message = messageOverride || inputMessage.trim();
    
    if (!message || requestState === "sending" || requestState === "waiting") {
      return;
    }

    // Prevent duplicate sends - check if request is in flight
    if (isRequestInFlightRef.current) {
      console.warn('[Send] Duplicate send attempt blocked - request in flight');
      return;
    }

    // Clear debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setInputMessage("");
    setSelectedChipIndex(-1);
    
    await sendToAI(message, false);
  }, [inputMessage, requestState, sendToAI]);

  // Handle quick reply selection
  const handleQuickReply = useCallback((reply: string, index: number) => {
    if (requestState === "sending" || requestState === "waiting") {
      return;
    }
    
    // Prevent duplicate quick reply sends
    if (isRequestInFlightRef.current) {
      console.warn('[QuickReply] Duplicate quick reply blocked - request in flight');
      return;
    }
    
    setSelectedChipIndex(index);
    handleSendMessage(reply);
  }, [requestState, handleSendMessage]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (!lastFailedMessage) return;
    
    setRetryAttempt(0);
    sendToAI(lastFailedMessage, true);
  }, [lastFailedMessage, sendToAI]);

  // Handle edit last message
  const handleEditLastMessage = useCallback(() => {
    if (messages.length === 0) return;
    
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      setInputMessage(lastUserMessage.content);
      setMessages(prev => prev.filter(m => m !== lastUserMessage));
      setRequestState("idle");
      setLastFailedMessage(null);
    }
  }, [messages]);

  // Handle abort
  const handleAbort = useCallback(() => {
    if (abortController.current && requestState === "waiting") {
      console.log('[User Action] Aborting current request');
      abortController.current.abort();
      traceTurn(currentTurn?.turnId || "unknown", "error", "abort");
    }
  }, [requestState, currentTurn]);

  // Keyboard navigation for chips
  const handleChipKeyDown = useCallback((e: React.KeyboardEvent, index: number, reply: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleQuickReply(reply, index);
    } else if (e.key === "ArrowRight" && index < quickReplies.length - 1) {
      e.preventDefault();
      chipRefs.current[index + 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      chipRefs.current[index - 1]?.focus();
    } else if (e.key === "Tab" && !e.shiftKey && index < quickReplies.length - 1) {
      e.preventDefault();
      chipRefs.current[index + 1]?.focus();
    } else if (e.key === "Tab" && e.shiftKey && index > 0) {
      e.preventDefault();
      chipRefs.current[index - 1]?.focus();
    }
  }, [quickReplies.length, handleQuickReply]);

  // Debounced Enter handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      // Prevent if already sending
      if (requestState === "sending" || requestState === "waiting") {
        return;
      }
      
      // Debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        handleSendMessage();
      }, DEBOUNCE_MS);
    }
  }, [handleSendMessage, requestState]);

  // Validate form before starting chat
  const validateForm = useCallback((): boolean => {
    const errors: ValidationError[] = [];
    
    // Check category selection
    if (!formData.category) {
      errors.push({
        field: "category",
        message: "Please choose a category."
      });
    }
    
    // Check for deadline requirement
    if (!formData.deadline.trim()) {
      errors.push({
        field: "deadline",
        message: "Please enter a target deadline."
      });
    } else {
      // Validate that the deadline is in the future
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(deadlineDate.getTime()) || deadlineDate <= today) {
        errors.push({
          field: "deadline",
          message: "Target deadline must be in the future."
        });
      }
    }
    
    // Check for disallowed category intent in title/description
    const combinedText = `${formData.name} ${formData.description}`.trim();
    if (combinedText && detectDisallowedIntent(combinedText)) {
      errors.push({
        field: "title",
        message: "Heads up: DayBridge supports reminders and coordination, not medical advice, diagnosis, treatment, or dosage changes. Try framing this around the daily routine or support task.",
        isDisallowedCategory: true
      });
      setShowCategoryWarning(true);
    } else {
      setShowCategoryWarning(false);
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [formData]);
  
  // Start chat
  const handleStartChat = useCallback(() => {
    if (!formData.name.trim()) {
      return;
    }
    
    // Validate form first
    if (!validateForm()) {
      return;
    }
    
    console.log('[SMART] Starting chat - resetting all state');
    
    // Reset all state for fresh start
    circuitBreaker.reset();
    setCurrentSlot("SPECIFIC");
    setCompletedSlots(new Set());
    setSmartSummary({});
    setIsChatComplete(false);
    setRequestState("idle");
    setRetryAttempt(0);
    setLastError(null);
    setLastFailedMessage(null);
    setValidationErrors([]);
    setShowCategoryWarning(false);
    
    const initialMessage = {
      role: "user" as const,
      content: `I want to make a daily support plan for: "${formData.name}"${formData.description ? `. Context: ${formData.description}` : ""}`,
      timestamp: Date.now()
    };
    
    setMessages([initialMessage]);
    setStep("chat");
    
    console.log('[SMART] State reset complete, sending initial message');
    
    // Auto-send first message
    setTimeout(() => {
      sendToAI(initialMessage.content, false);
    }, 100);
  }, [formData, sendToAI, circuitBreaker, validateForm]);

  // Confirm care plan
  const handleConfirmSMART = useCallback(() => {
    setIsConfirmed(true);
    setStep("confirm");
  }, []);

  // Create care plan (stored through the existing goals table)
  const handleCreateGoal = useCallback(async () => {
    console.log("handleCreateGoal called", { isConfirmed, smartSummary });
    
    if (!isConfirmed || !smartSummary.specific) {
      console.log("Early return - conditions not met", { isConfirmed, hasSpecific: !!smartSummary.specific });
      return;
    }
    
    console.log("Creating goal...");
    setStep("creating");
    
    try {
      const goalId = await createGoalWithAI({
        title: smartSummary.specific || formData.name,
        description: `${smartSummary.measurable || ""}\n${smartSummary.achievable || ""}`.trim(),
        category: smartSummary.category || formData.category,
        priority: smartSummary.priority || formData.priority,
        targetDate: smartSummary.deadline || formData.deadline,
        smartGoal: {
          specific: smartSummary.specific || "",
          measurable: smartSummary.measurable || "",
          achievable: smartSummary.achievable || "",
          relevant: smartSummary.relevant || "",
          timeBound: smartSummary.timeBound || ""
        },
        idempotencyKey: idempotencyKeyRef.current
      });
      
      persistence.clearState();
      onSuccess?.(goalId);
      onClose();
      
    } catch (error) {
      console.error("Failed to create care plan:", error);
      toast.error("Failed to create care plan. Please try again.");
      setStep("confirm");
    }
  }, [isConfirmed, smartSummary, formData, createGoalWithAI, onSuccess, onClose, persistence]);

  // Render different steps
  const renderInitialForm = () => {
    const categoryError = validationErrors.find(e => e.field === "category");
    const titleError = validationErrors.find(e => e.field === "title");
    
    return (
      <div className="space-y-6 pt-2">
        {/* Disallowed category warning banner */}
        {showCategoryWarning && titleError?.isDisallowedCategory && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-[oklch(93%_0.055_95)] border border-[oklch(72%_0.08_75)] rounded-[12px]"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[oklch(45%_0.12_75)] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[oklch(28%_0.045_145)]">
                <strong className="font-bold text-[oklch(35%_0.08_75)]">Heads up:</strong> {titleError.message}
              </div>
            </div>
          </motion.div>
        )}

        <div>
          <Label htmlFor="goal-name" className="text-sm font-bold text-[oklch(28%_0.045_145)] mb-2 block">
            What does this person need help remembering or doing?
          </Label>
          <Input
            id="goal-name"
            placeholder="e.g., Prepare for a doctor visit, keep the morning routine on track..."
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              // Clear title error on change
              if (titleError) {
                setValidationErrors(prev => prev.filter(e => e.field !== "title"));
                setShowCategoryWarning(false);
              }
            }}
            autoComplete="off"
            className={`bg-white border-[oklch(84%_0.03_116)] text-[oklch(22%_0.035_145)] placeholder:text-[oklch(62%_0.025_145)] focus:border-[oklch(40%_0.1_153)] focus:ring-2 focus:ring-[oklch(40%_0.1_153)]/20 rounded-[8px] ${
              titleError ? "border-[oklch(55%_0.15_25)]" : ""
            }`}
          />
        </div>

        <div>
          <Label htmlFor="goal-description" className="text-sm font-bold text-[oklch(28%_0.045_145)] mb-2 block">
            Helpful context (optional)
          </Label>
          <Textarea
            id="goal-description"
            placeholder="Who is involved, what usually gets missed, or what support would help..."
            value={formData.description}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, description: e.target.value }));
              // Clear title error on change
              if (titleError) {
                setValidationErrors(prev => prev.filter(e => e.field !== "title"));
                setShowCategoryWarning(false);
              }
            }}
            autoComplete="off"
            className="bg-white border-[oklch(84%_0.03_116)] text-[oklch(22%_0.035_145)] placeholder:text-[oklch(62%_0.025_145)] focus:border-[oklch(40%_0.1_153)] focus:ring-2 focus:ring-[oklch(40%_0.1_153)]/20 rounded-[8px] min-h-[100px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category" className="text-sm font-bold text-[oklch(28%_0.045_145)] mb-2 block">
              Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={(val) => {
                setFormData(prev => ({ ...prev, category: val }));
                // Clear category error on selection
                setValidationErrors(prev => prev.filter(e => e.field !== "category"));
              }}
            >
              <SelectTrigger 
                id="category" 
                className={`bg-white border-[oklch(84%_0.03_116)] text-[oklch(22%_0.035_145)] focus:border-[oklch(40%_0.1_153)] focus:ring-2 focus:ring-[oklch(40%_0.1_153)]/20 rounded-[8px] ${
                  categoryError ? "border-[oklch(55%_0.15_25)]" : ""
                }`}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[oklch(84%_0.03_116)] text-[oklch(22%_0.035_145)] rounded-[8px]">
                {CATEGORY_UI.map(cat => (
                  <SelectItem
                    key={cat.value}
                    value={cat.value}
                    className="focus:bg-[oklch(94%_0.035_116)] focus:text-[oklch(22%_0.035_145)]"
                  >
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryError && (
              <p className="mt-2 text-sm text-[oklch(55%_0.15_25)]">{categoryError.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="priority" className="text-sm font-bold text-[oklch(28%_0.045_145)] mb-2 block">
              Priority
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
            >
              <SelectTrigger 
                id="priority" 
                className="bg-white border-[oklch(84%_0.03_116)] text-[oklch(22%_0.035_145)] focus:border-[oklch(40%_0.1_153)] focus:ring-2 focus:ring-[oklch(40%_0.1_153)]/20 rounded-[8px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[oklch(84%_0.03_116)] text-[oklch(22%_0.035_145)] rounded-[8px]">
                <SelectItem value="low" className="focus:bg-[oklch(94%_0.035_116)] focus:text-[oklch(22%_0.035_145)]">Low</SelectItem>
                <SelectItem value="medium" className="focus:bg-[oklch(94%_0.035_116)] focus:text-[oklch(22%_0.035_145)]">Medium</SelectItem>
                <SelectItem value="high" className="focus:bg-[oklch(94%_0.035_116)] focus:text-[oklch(22%_0.035_145)]">High</SelectItem>
                <SelectItem value="critical" className="focus:bg-[oklch(94%_0.035_116)] focus:text-[oklch(22%_0.035_145)]">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="deadline" className="text-sm font-bold text-[oklch(28%_0.045_145)] mb-2 block">
            Target deadline *
          </Label>
          <SimpleDateInput
            id="deadline"
            value={formData.deadline}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, deadline: value }));
              // Clear deadline error on change
              setValidationErrors(prev => prev.filter(e => e.field !== "deadline"));
            }}
            placeholder="MM/DD/YYYY"
            className={`w-full px-4 py-3 bg-white border text-[oklch(22%_0.035_145)] focus:border-[oklch(40%_0.1_153)] focus:ring-2 focus:ring-[oklch(40%_0.1_153)]/20 rounded-[8px] outline-none transition-all ${
              validationErrors.find(e => e.field === "deadline") ? "border-[oklch(55%_0.15_25)]" : "border-[oklch(84%_0.03_116)]"
            }`}
          />
          {validationErrors.find(e => e.field === "deadline") && (
            <p className="mt-2 text-sm text-[oklch(55%_0.15_25)]">
              {validationErrors.find(e => e.field === "deadline")?.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-[oklch(86%_0.03_116)]">
          <Button
            variant="outline" 
            onClick={onClose}
            className="border-[oklch(78%_0.032_116)] bg-[oklch(99%_0.008_116)] text-[oklch(25%_0.045_145)] hover:border-[oklch(57%_0.08_153)] hover:bg-white rounded-[12px] font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartChat}
            disabled={!formData.name.trim()}
            className="border border-[oklch(45%_0.09_153)] bg-[oklch(40%_0.1_153)] text-white font-bold hover:bg-[oklch(34%_0.105_153)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[12px] shadow-[0_4px_12px_rgba(28,92,61,0.15)]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start Care Plan Chat
          </Button>
        </div>
      </div>
    );
  };

  const renderChat = () => {
    const isInputDisabled = 
      !hasAPIKey || 
      !isAIHealthy || 
      connectivity.isOffline || 
      circuitBreaker.isOpen || 
      requestState === "sending" || 
      requestState === "waiting";

    const isSendDisabled = 
      isInputDisabled || 
      !inputMessage.trim() || 
      chatQueue.hasInFlight;

    return (
      <div className="flex flex-col h-[600px]">
        {/* Status indicators */}
        <div className="mb-3 space-y-2">
          {/* Connection status chip */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connectivity.isOffline ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-700">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-700">
                  <Wifi className="w-3 h-3" />
                  Online
                </div>
              )}

              {/* Request state indicator */}
              {requestState !== "idle" && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                  requestState === "sending" ? "bg-blue-50 border-blue-200 text-blue-700" :
                  requestState === "waiting" ? "bg-purple-50 border-purple-200 text-purple-700 animate-pulse" :
                  requestState === "success" ? "bg-green-50 border-green-200 text-green-700" :
                  "bg-red-50 border-red-200 text-red-700"
                }`}>
                  <Activity className="w-3 h-3" />
                  {requestState === "sending" ? "Sending..." :
                   requestState === "waiting" ? "Waiting for AI..." :
                   requestState === "success" ? "Success" :
                   "Error"}
                </div>
              )}

              {/* Circuit breaker indicator */}
              {circuitBreaker.isOpen && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700">
                  <AlertCircle className="w-3 h-3" />
                  Cooldown: {circuitBreaker.remainingSeconds}s
                </div>
              )}

              {/* Queue indicator */}
              {chatQueue.queueSize > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs text-yellow-700">
                  Queued: {chatQueue.queueSize}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {showSummary && (
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <ChevronDown className="w-3 h-3" />
                  Hide Summary
                </button>
              )}
              
              {/* Dev console toggle (dev mode only) */}
              {import.meta.env.DEV && (
                <button
                  onClick={() => setShowDevConsole(!showDevConsole)}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  title="Toggle dev diagnostics"
                >
                  {showDevConsole ? '▼ Dev Console' : '▶ Dev Console'}
                </button>
              )}
            </div>
          </div>
          
          {/* Dev console panel */}
          {import.meta.env.DEV && showDevConsole && (
            <div className="mt-2 p-3 bg-black/60 border border-cyan-500/30 rounded text-[10px] font-mono space-y-1.5">
              <div className="text-cyan-400 font-bold mb-2">📊 Diagnostics</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="text-gray-400">State:</div>
                <div className="text-cyan-300">{requestState.toUpperCase()}</div>
                
                <div className="text-gray-400">Messages:</div>
                <div className="text-cyan-300">{messages.length} ({messages.filter(m => m.role === 'user').length} user)</div>
                
                <div className="text-gray-400">Circuit:</div>
                <div className={circuitBreaker.isOpen ? "text-orange-400" : "text-green-400"}>
                  {circuitBreaker.isOpen ? `OPEN (${circuitBreaker.remainingSeconds}s)` : `CLOSED (${circuitBreaker.failureCount})`}
                </div>
                
                <div className="text-gray-400">Queue:</div>
                <div className="text-cyan-300">{chatQueue.hasInFlight ? 'IN-FLIGHT' : 'IDLE'} | {chatQueue.queueSize}</div>
                
                <div className="text-gray-400">Retries:</div>
                <div className="text-cyan-300">{retryAttempt}/{MAX_RETRIES}</div>
              </div>
              
              {lastError && (
                <div className="pt-2 mt-2 border-t border-gray-700/50">
                  <div className="text-orange-400 mb-1">⚠ Last Error</div>
                  <div className="text-gray-400">Kind: <span className="text-orange-300">{lastError.kind}</span></div>
                  <div className="text-gray-500 text-[9px] truncate mt-0.5">{lastError.message}</div>
                </div>
              )}
              
              {turnHistory.length > 0 && (
                <div className="pt-2 mt-2 border-t border-gray-700/50">
                  <div className="text-gray-400 mb-1">🔄 Recent Turns</div>
                  {turnHistory.slice(-3).reverse().map((turn, i) => (
                    <div key={turn.turnId} className="text-gray-500 flex items-center justify-between">
                      <span className="text-gray-400">{turn.turnId.substring(5, 13)}</span>
                      <span className={
                        turn.state === 'success' ? 'text-green-400' :
                        turn.state === 'error' ? 'text-red-400' :
                        'text-yellow-400'
                      }>
                        {turn.state} {turn.duration ? `(${turn.duration}ms)` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* API Key warning */}
          {!hasAPIKey && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-800">
                <strong className="text-amber-700">AI temporarily unavailable:</strong> Please try again in a moment.
              </div>
            </div>
          )}

          {/* AI health warning */}
          {!isAIHealthy && hasAPIKey && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-800">
                <strong className="text-red-700">AI Service Error:</strong> {aiHealth?.message || "Unable to connect to AI service"}
              </div>
            </div>
          )}

          {/* Circuit breaker warning */}
          {circuitBreaker.isOpen && (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-800">
                  <strong className="text-amber-700">Too many failures.</strong> Waiting {circuitBreaker.remainingSeconds}s before retry...
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={circuitBreaker.forceClose}
                className="text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Try Now
            </Button>
            </div>
          )}

          {/* Error message */}
          {requestState === "error" && lastFailedMessage && (
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-800">
                  <strong className="text-red-700">Message failed.</strong> You can retry or edit your last message.
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditLastMessage}
                  className="text-xs h-7 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
              </Button>
              <Button
                  size="sm"
                  onClick={handleRetry}
                  className="text-xs h-7 bg-[color:oklch(40%_0.1_153)] hover:bg-[color:oklch(35%_0.1_153)] text-white"
              >
                  Retry
              </Button>
              </div>
            </div>
          )}

          {/* Dev diagnostics ribbon (only in dev) */}
          {/* Dev diagnostics hidden - errors logged to console */}
        </div>

        {/* Chat container */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2" ref={chatContainerRef}>
            <AnimatePresence mode="popLayout">
              {messages.map((msg, idx) => (
          <motion.div
                  key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-lg ${
                      msg.role === "user"
                        ? "bg-[color:oklch(40%_0.1_153)]/10 border border-[color:oklch(40%_0.1_153)]/30 text-gray-900"
                        : "bg-white border border-gray-200 text-gray-900"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-sm leading-relaxed">
                        <MarkdownText content={msg.content} />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Streaming response */}
              {streamingResponse && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900">
                    <div className="text-sm leading-relaxed">
                      <MarkdownText content={streamingResponse} />
                    </div>
                    <span className="inline-block w-2 h-4 bg-[color:oklch(40%_0.1_153)] animate-pulse ml-1" />
                  </div>
                </motion.div>
              )}

              {/* Thinking indicator */}
              {(requestState === "sending" || requestState === "waiting") && !streamingResponse && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="px-4 py-2.5 rounded-lg bg-white border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[color:oklch(40%_0.1_153)]" />
                      <span className="text-sm text-gray-700">
                        {requestState === "sending" ? "Sending..." : "DayBridge is thinking..."}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick replies */}
            {quickReplies.length > 0 && requestState === "idle" && (
              <div className="flex flex-wrap gap-2 pt-2">
                {quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    ref={(el) => (chipRefs.current[idx] = el)}
                    onClick={() => handleQuickReply(reply, idx)}
                    onKeyDown={(e) => handleChipKeyDown(e, idx, reply)}
                    disabled={isInputDisabled}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      selectedChipIndex === idx
                        ? "bg-[color:oklch(40%_0.1_153)]/20 border-[color:oklch(40%_0.1_153)] text-gray-900 shadow-md"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[color:oklch(40%_0.1_153)]/50"
                    } ${isInputDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SMART Summary Panel */}
          {showSummary && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-64 bg-white border border-gray-200 rounded-lg p-4 space-y-3 flex-shrink-0 overflow-y-auto shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-gray-900 uppercase tracking-wider">Care Plan Summary</h4>
                <button onClick={() => setShowSummary(false)} className="text-gray-500 hover:text-gray-900 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress meter */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-[color:oklch(40%_0.1_153)] font-medium">{getCompletionPercentage()}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getCompletionPercentage()}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full bg-[color:oklch(40%_0.1_153)] rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>Step {completedSlots.size + 1}/5</span>
                  <span className="text-[color:oklch(40%_0.1_153)]">{getSlotConfig(currentSlot).label}</span>
                </div>
              </div>

              {Object.keys(smartSummary).length === 0 ? (
                <p className="text-xs text-gray-500 italic">Chat to build a clear care plan...</p>
              ) : (
                <div className="space-y-3 text-xs">
                  {smartSummary.specific && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                      <div className="font-medium text-blue-700 mb-1 uppercase tracking-wide text-[10px]">Specific</div>
                      <div className="text-gray-800 leading-relaxed">{smartSummary.specific}</div>
                    </div>
                  )}
                  {smartSummary.measurable && (
                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded">
                      <div className="font-medium text-purple-700 mb-1 uppercase tracking-wide text-[10px]">Measurable</div>
                      <div className="text-gray-800 leading-relaxed">{smartSummary.measurable}</div>
                    </div>
                  )}
                  {smartSummary.achievable && (
                    <div className="p-2.5 bg-green-50 border border-green-200 rounded">
                      <div className="font-medium text-green-700 mb-1 uppercase tracking-wide text-[10px]">Achievable</div>
                      <div className="text-gray-800 leading-relaxed">{smartSummary.achievable}</div>
                    </div>
                  )}
                  {smartSummary.relevant && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded">
                      <div className="font-medium text-amber-700 mb-1 uppercase tracking-wide text-[10px]">Relevant</div>
                      <div className="text-gray-800 leading-relaxed">{smartSummary.relevant}</div>
                    </div>
                  )}
                  {smartSummary.timeBound && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded">
                      <div className="font-medium text-red-700 mb-1 uppercase tracking-wide text-[10px]">Time-bound</div>
                      <div className="text-gray-800 leading-relaxed">{smartSummary.timeBound}</div>
                    </div>
                  )}
                  {smartSummary.category && (
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
                      <div className="font-medium text-gray-700 mb-1 uppercase tracking-wide text-[10px]">Category</div>
                      <div className="text-gray-800 leading-relaxed">{smartSummary.category}</div>
                    </div>
                  )}
                  {smartSummary.deadline && (
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
                      <div className="font-medium text-gray-700 mb-1 uppercase tracking-wide text-[10px]">Deadline</div>
                      <div className="text-gray-800 leading-relaxed">{smartSummary.deadline}</div>
                    </div>
                  )}
                </div>
              )}
          </motion.div>
          )}
        </div>

        {/* Input area */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  connectivity.isOffline ? "You're offline..." :
                  circuitBreaker.isOpen ? "Circuit breaker active..." :
                  !hasAPIKey ? "API key required..." :
                  !isAIHealthy ? "AI service unavailable..." :
                  requestState === "waiting" ? "Waiting for AI..." :
                  "Type your response..."
                }
                disabled={isInputDisabled}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-[color:oklch(40%_0.1_153)] focus:ring-[color:oklch(40%_0.1_153)]/20 pr-10"
              />
              {requestState === "waiting" && (
                <button
                  onClick={handleAbort}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-700 transition-colors"
                  title="Cancel request"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              onClick={() => handleSendMessage()}
              disabled={isSendDisabled}
              size="icon"
              className="bg-[color:oklch(40%_0.1_153)] hover:bg-[color:oklch(35%_0.1_153)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Show confirm button when chat is complete */}
          {isChatComplete && (
            <Button
              onClick={handleConfirmSMART}
              className="w-full mt-3 bg-[color:oklch(40%_0.1_153)] hover:bg-[color:oklch(35%_0.1_153)] text-white font-medium shadow-md"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Care Plan
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderConfirm = () => (
    <div className="space-y-6 pt-2">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Care Plan Ready</h3>
            <p className="text-sm text-gray-700">
              The plan has been clarified and checked. Review the summary below and add it to the day board.
            </p>
          </div>
        </div>
            </div>

      <div className="space-y-3">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="font-medium text-blue-700 text-xs mb-2 uppercase tracking-wider">Specific</div>
          <p className="text-sm text-gray-900 leading-relaxed">{smartSummary.specific}</p>
              </div>

        {smartSummary.measurable && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="font-medium text-purple-700 text-xs mb-2 uppercase tracking-wider">Measurable</div>
            <p className="text-sm text-gray-900 leading-relaxed">{smartSummary.measurable}</p>
            </div>
        )}

        {smartSummary.achievable && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="font-medium text-green-700 text-xs mb-2 uppercase tracking-wider">Achievable</div>
            <p className="text-sm text-gray-900 leading-relaxed">{smartSummary.achievable}</p>
          </div>
        )}

        {smartSummary.timeBound && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="font-medium text-red-700 text-xs mb-2 uppercase tracking-wider">Time-bound</div>
            <p className="text-sm text-gray-900 leading-relaxed">{smartSummary.timeBound}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-3 pt-5 border-t border-gray-200">
              <Button
                variant="outline"
          onClick={() => setStep("chat")}
          className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Plan
              </Button>
              <Button
          onClick={handleCreateGoal}
          className="bg-[color:oklch(40%_0.1_153)] hover:bg-[color:oklch(35%_0.1_153)] text-white font-medium shadow-md"
              >
          <PlayCircle className="w-4 h-4 mr-2" />
          Add Care Plan
              </Button>
            </div>
    </div>
  );

  const renderCreating = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="absolute inset-0 blur-xl bg-[color:oklch(40%_0.1_153)]/20 animate-pulse"></div>
        <Loader2 className="relative w-12 h-12 animate-spin text-[color:oklch(40%_0.1_153)] mb-4" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating Your Care Plan...</h3>
      <p className="text-sm text-gray-400">Generating checkpoints and daily tasks...</p>
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-white border border-[oklch(84%_0.03_116)] text-[oklch(22%_0.035_145)] shadow-[0_28px_70px_rgba(24,42,31,0.16)] rounded-[16px]">
        <DialogHeader className="pb-4 border-b border-[oklch(86%_0.03_116)]">
          <DialogTitle className="text-2xl font-black text-[oklch(22%_0.035_145)]">
            {step === "initial" && "Add Care Plan"}
            {step === "chat" && "Care Plan Chat with DayBridge"}
            {step === "confirm" && "Confirm Your Care Plan"}
            {step === "creating" && "Creating Care Plan"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a care plan for routines, appointments, and support needs. You can skip any optional fields.
          </DialogDescription>
        </DialogHeader>

        {step === "initial" && renderInitialForm()}
        {step === "chat" && renderChat()}
        {step === "confirm" && renderConfirm()}
        {step === "creating" && renderCreating()}
      </DialogContent>
    </Dialog>
  );
}
