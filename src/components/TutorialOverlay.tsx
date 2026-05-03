/**
 * TutorialOverlay Component
 * 
 * Interactive tutorial system with spotlight effect that guides new users
 * through the main features of DayBridge.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import {
  getViewportSize,
  readSessionStorage,
  removeSessionStorage,
  writeSessionStorage,
} from '../lib/browser';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right';
  highlightPadding?: number; // Extra padding around highlighted element
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'galaxy-view',
    title: 'Welcome to Your Day Map',
    description: 'This is your Day Map, a visual view of active care plans and the routines that need attention today.',
    targetSelector: '.galaxy-map-container',
    position: 'top',
    highlightPadding: 20,
  },
  {
    id: 'nav-missions',
    title: 'Care Plans',
    description: 'View active care plans in a detailed list. See progress, due dates, and the next checkpoint.',
    targetSelector: '[data-tutorial="nav-missions"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'nav-timeline',
    title: 'Calendar',
    description: 'See tasks organized by day, week, month, or year so plans are easier to follow.',
    targetSelector: '[data-tutorial="nav-timeline"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'nav-achievements',
    title: 'Milestones',
    description: 'Track completed care plans, streaks, and steady progress over time.',
    targetSelector: '[data-tutorial="nav-achievements"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'nav-skills',
    title: 'Strengths',
    description: 'Every completed task reveals strengths and support patterns that can help the care circle.',
    targetSelector: '[data-tutorial="nav-skills"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'nav-resume',
    title: 'Care Summary',
    description: 'Generate a plain-language summary for family updates, helper handoffs, and appointment prep.',
    targetSelector: '[data-tutorial="nav-resume"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'nav-connect',
    title: 'Care Circle',
    description: 'Connect with trusted helpers and people who can support similar routines or needs.',
    targetSelector: '[data-tutorial="nav-connect"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'xp-bar',
    title: 'Progress',
    description: 'Track care points and progress. Completed tasks show what is working and what may need help.',
    targetSelector: '[data-tutorial="xp-bar"]',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'launch-button-top',
    title: 'Add Care Plan',
    description: 'Create a new care plan. DayBridge helps turn a support need into practical checkpoints.',
    targetSelector: '[data-tutorial="launch-button"]',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'streak',
    title: 'Daily Streak',
    description: 'Build a streak by completing daily tasks and keeping important routines visible.',
    targetSelector: '[data-tutorial="streak-button"]',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Access profile settings, milestones, feedback, tutorial replay, and calendar export.',
    targetSelector: '[data-tutorial="profile-button"]',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'mission-progress',
    title: 'Care Plan Progress',
    description: 'See progress across care plans, checkpoints, and tasks at a glance.',
    targetSelector: '[data-tutorial="mission-progress"]',
    position: 'top',
    highlightPadding: 12,
  },
  {
    id: 'chat-button',
    title: 'DayBridge Guide',
    description: 'Chat with DayBridge for scheduling help, routine planning, and gentle next-step suggestions.',
    targetSelector: '[data-tutorial="chat-button"]',
    position: 'top',
    highlightPadding: 12,
  },
];

interface TutorialOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ onComplete, onSkip }: TutorialOverlayProps) {
  const isDev = import.meta.env.DEV;
  const debugTutorial = React.useMemo(() => {
    if (!isDev) return false;
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("daybridge_debug_tutorial") === "1";
    } catch {
      return false;
    }
  }, [isDev]);

  const tlog = React.useCallback(
    (...args: unknown[]) => {
      if (debugTutorial) console.log(...args);
    },
    [debugTutorial],
  );

  const twarn = React.useCallback(
    (...args: unknown[]) => {
      if (debugTutorial) console.warn(...args);
    },
    [debugTutorial],
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const savedProgress = readSessionStorage('tutorialProgress');
    if (savedProgress) {
      const stepIndex = parseInt(savedProgress, 10);
      tlog('[Tutorial] Resuming from saved step:', stepIndex);
      return stepIndex >= 0 && stepIndex < TUTORIAL_STEPS.length ? stepIndex : 0;
    }
    return 0;
  });
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipTransform, setTooltipTransform] = useState({ position: 'bottom' as 'top' | 'bottom' | 'left' | 'right', alignment: 'center' as string });
  const completeTutorial = useMutation(api.users.completeTutorial);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  // Save tutorial progress whenever step changes
  useEffect(() => {
    writeSessionStorage('tutorialProgress', currentStepIndex.toString());
    writeSessionStorage('tutorialActive', 'true');
    tlog('[Tutorial] Saved progress: step', currentStepIndex);
  }, [currentStepIndex, tlog]);

  // Clean up on unmount (user navigated away)
  useEffect(() => {
    return () => {
      if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
        writeSessionStorage('tutorialPaused', 'true');
        tlog('[Tutorial] Paused at step', currentStepIndex);
      }
    };
  }, [currentStepIndex, tlog]);

  // Log tutorial start
  useEffect(() => {
    tlog('[Tutorial] Tutorial overlay mounted');
    tlog('[Tutorial] Total steps:', TUTORIAL_STEPS.length);
    tlog('[Tutorial] Starting at step:', currentStepIndex);
  }, [currentStepIndex, tlog]);

  // Force recalculation when page becomes visible (user returns from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        tlog('[Tutorial] Page became visible, forcing spotlight recalculation');
        setSpotlightRect(null);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tlog]);

  // Update spotlight position when step changes or component mounts
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    
    const updateSpotlight = () => {
      const element = document.querySelector(currentStep.targetSelector);
      const viewport = getViewportSize({ width: 1280, height: 720 });
      
      if (!element) {
        twarn(
          `[Tutorial] Element not found for selector: ${currentStep.targetSelector} (attempt ${retryCount + 1}/${maxRetries})`,
        );
        tlog(
          '[Tutorial] Available elements with data-tutorial:',
          Array.from(document.querySelectorAll('[data-tutorial]')).map((el) =>
            el.getAttribute('data-tutorial'),
          ),
        );
        
        // Retry after a short delay (element might not be rendered yet)
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(updateSpotlight, 100);
        }
        return;
      }
      
      // Reset retry count on success
      retryCount = 0;
      
      tlog(`[Tutorial] Found element for step "${currentStep.id}":`, element);
      
      const rect = element.getBoundingClientRect();
      setSpotlightRect(rect);
      
      // Calculate tooltip position with smart viewport bounds checking
      const padding = currentStep.highlightPadding || 12;
      // Use responsive tooltip width - smaller on mobile
      const tooltipWidth = viewport.width < 640 ? Math.min(viewport.width * 0.9, 384) : 384; // max-w-sm = 384px
      const tooltipHeight = 280; // Approximate height (reduced for accuracy)
      const gap = viewport.width < 640 ? 12 : 16; // Smaller gap on mobile
      const edgePadding = viewport.width < 640 ? 8 : 16; // Less edge padding on mobile
      
      let x = 0;
      let y = 0;
      let alignment = 'center';
      let finalPosition = currentStep.position;

      // Helper to check if position fits
      const fitsInViewport = (testX: number, testY: number, pos: string) => {
        if (pos === 'left' || pos === 'right') {
          const halfHeight = tooltipHeight / 2;
          return testY - halfHeight >= edgePadding && 
                 testY + halfHeight <= viewport.height - edgePadding &&
                 (pos === 'left' ? testX - tooltipWidth >= edgePadding : testX + tooltipWidth <= viewport.width - edgePadding);
        } else {
          return testY >= edgePadding && 
                 testY + tooltipHeight <= viewport.height - edgePadding;
        }
      };

      // Try preferred position first, then fallback
      const tryPosition = (pos: 'top' | 'bottom' | 'left' | 'right') => {
        switch (pos) {
          case 'bottom':
            y = rect.bottom + gap;
            const centerX = rect.left + rect.width / 2;
            
            // Determine horizontal alignment
            if (centerX + tooltipWidth / 2 > viewport.width - edgePadding) {
              x = rect.right - tooltipWidth;
              alignment = 'right';
            } else if (centerX - tooltipWidth / 2 < edgePadding) {
              x = rect.left;
              alignment = 'left';
            } else {
              x = centerX;
              alignment = 'center';
            }
            
            // Clamp X to viewport
            x = Math.max(edgePadding, Math.min(x, viewport.width - tooltipWidth - edgePadding));
            
            return fitsInViewport(x, y, 'bottom');
            
          case 'top':
            y = rect.top - gap - tooltipHeight;
            const centerXTop = rect.left + rect.width / 2;
            
            if (centerXTop + tooltipWidth / 2 > viewport.width - edgePadding) {
              x = rect.right - tooltipWidth;
              alignment = 'right';
            } else if (centerXTop - tooltipWidth / 2 < edgePadding) {
              x = rect.left;
              alignment = 'left';
            } else {
              x = centerXTop;
              alignment = 'center';
            }
            
            x = Math.max(edgePadding, Math.min(x, viewport.width - tooltipWidth - edgePadding));
            
            return fitsInViewport(x, y, 'top');
            
          case 'left':
            x = rect.left - gap - tooltipWidth;
            y = rect.top + rect.height / 2;
            alignment = 'middle';
            
            // Clamp Y to viewport
            const halfHeight = tooltipHeight / 2;
            y = Math.max(halfHeight + edgePadding, Math.min(y, viewport.height - halfHeight - edgePadding));
            
            return fitsInViewport(x, y, 'left');
            
          case 'right':
            x = rect.right + gap;
            y = rect.top + rect.height / 2;
            alignment = 'middle';
            
            // Clamp Y to viewport
            const halfHeightRight = tooltipHeight / 2;
            y = Math.max(halfHeightRight + edgePadding, Math.min(y, viewport.height - halfHeightRight - edgePadding));
            
            return fitsInViewport(x, y, 'right');
        }
        return false;
      };

      // Try positions in order of preference
      // On narrow screens (< 900px), prefer top/bottom over left/right to avoid horizontal overflow
      const isNarrowScreen = viewport.width < 900;
      const positionPriority: Array<'top' | 'bottom' | 'left' | 'right'> = 
        isNarrowScreen 
          ? (currentStep.position === 'top' || currentStep.position === 'bottom' 
              ? [currentStep.position, currentStep.position === 'top' ? 'bottom' : 'top', 'left', 'right']
              : ['bottom', 'top', 'left', 'right'])
          : (currentStep.position === 'top' ? ['top', 'bottom', 'right', 'left'] :
             currentStep.position === 'bottom' ? ['bottom', 'top', 'right', 'left'] :
             currentStep.position === 'left' ? ['left', 'right', 'bottom', 'top'] :
             ['right', 'left', 'bottom', 'top']);

      let positionFound = false;
      for (const pos of positionPriority) {
        if (tryPosition(pos)) {
          finalPosition = pos;
          positionFound = true;
          break;
        }
      }

      // If no position fits perfectly, use preferred and clamp
      if (!positionFound) {
        tryPosition(currentStep.position);
        finalPosition = currentStep.position;
      }
      
      // Special handling for first step (galaxy-view) - ensure tooltip is visible
      // If tooltip would be below viewport, center it on screen instead
      if (currentStep.id === 'galaxy-view' && y + tooltipHeight > viewport.height - edgePadding) {
        tlog('[Tutorial] First step tooltip would be off-screen, centering on viewport');
        x = viewport.width / 2;
        y = Math.min(viewport.height / 2, rect.top + rect.height / 2);
        finalPosition = 'bottom';
        alignment = 'center';
      }
      
      // Special handling for mission-progress - ensure it's always visible and centered
      if (currentStep.id === 'mission-progress') {
        // On narrow screens or when element is low on screen, position tooltip above and centered
        if (viewport.width < 900 || rect.top > viewport.height / 2) {
          tlog('[Tutorial] Mission progress on small screen or low position, positioning above');
          x = rect.left + rect.width / 2;
          y = rect.top - gap - tooltipHeight;
          finalPosition = 'top';
          alignment = 'center';
          // Ensure it doesn't go off top of screen
          if (y < edgePadding) {
            y = rect.bottom + gap;
            finalPosition = 'bottom';
          }
        }
      }

      setTooltipPosition({ x, y });
      setTooltipTransform({ position: finalPosition, alignment });
      
      tlog(`[Tutorial] Positioning for "${currentStep.id}":`, {
        elementRect: rect,
        tooltipPos: { x, y },
        finalPosition,
        alignment,
        viewport,
      });
    };

    // Force immediate update when component mounts or step changes
    // This handles the case when user navigates back to Galaxy View
    updateSpotlight();
    
    // Also update after a delay to catch late-rendering elements
    const timer = setTimeout(updateSpotlight, 100);

    // Update on resize and scroll
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true); // Capture phase for all scrolls
    
    // Use MutationObserver to detect when DOM changes (elements added/removed)
    const observer = new MutationObserver(() => {
      updateSpotlight();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tutorial']
    });
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
      observer.disconnect();
    };
  }, [currentStep, isDev]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = async () => {
    try {
      await completeTutorial();
      removeSessionStorage('tutorialProgress');
      removeSessionStorage('tutorialPaused');
      removeSessionStorage('tutorialActive');
      toast.success('Tutorial skipped. You can replay it anytime from your profile menu!');
      onSkip();
    } catch (error) {
      console.error('Failed to mark tutorial as complete:', error);
      onSkip();
    }
  };

  const handleComplete = async () => {
    try {
      await completeTutorial();
      removeSessionStorage('tutorialProgress');
      removeSessionStorage('tutorialPaused');
      removeSessionStorage('tutorialActive');
      toast.success('Tutorial complete! Your daily board is ready.');
      onComplete();
    } catch (error) {
      console.error('Failed to mark tutorial as complete:', error);
      onComplete();
    }
  };

  // Create spotlight clip path
  const createClipPath = () => {
    if (!spotlightRect) return '';
    
    const padding = currentStep.highlightPadding || 12;
    const x = spotlightRect.left - padding;
    const y = spotlightRect.top - padding;
    const width = spotlightRect.width + padding * 2;
    const height = spotlightRect.height + padding * 2;
    
    return `polygon(
      0% 0%, 
      0% 100%, 
      ${x}px 100%, 
      ${x}px ${y}px, 
      ${x + width}px ${y}px, 
      ${x + width}px ${y + height}px, 
      ${x}px ${y + height}px, 
      ${x}px 100%, 
      100% 100%, 
      100% 0%
    )`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] pointer-events-none">
        {/* Dark Overlay with Spotlight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
          style={{
            clipPath: spotlightRect ? createClipPath() : 'none',
          }}
        />

        {/* Highlighted Element Border */}
        {spotlightRect && (
          <>
            {/* Glowing Border */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute border-4 border-[var(--accent-cyan)] rounded-lg pointer-events-none"
              style={{
                left: spotlightRect.left - (currentStep.highlightPadding || 12),
                top: spotlightRect.top - (currentStep.highlightPadding || 12),
                width: spotlightRect.width + (currentStep.highlightPadding || 12) * 2,
                height: spotlightRect.height + (currentStep.highlightPadding || 12) * 2,
                boxShadow: '0 0 30px rgba(0, 224, 255, 0.6), 0 0 60px rgba(0, 224, 255, 0.3)',
              }}
            />
            
            {/* Pulsing Glow Effect */}
            <motion.div
              animate={{ 
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute border-4 border-[var(--accent-cyan)]/50 rounded-lg pointer-events-none"
              style={{
                left: spotlightRect.left - (currentStep.highlightPadding || 12),
                top: spotlightRect.top - (currentStep.highlightPadding || 12),
                width: spotlightRect.width + (currentStep.highlightPadding || 12) * 2,
                height: spotlightRect.height + (currentStep.highlightPadding || 12) * 2,
              }}
            />
          </>
        )}

        {/* Tooltip */}
        <motion.div
          key={`tooltip-${currentStepIndex}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute pointer-events-auto"
          style={{
            left: `${Math.max(8, Math.min(tooltipPosition.x, getViewportSize({ width: 1280, height: 720 }).width - 8))}px`,
            top: `${Math.max(8, Math.min(tooltipPosition.y, getViewportSize({ width: 1280, height: 720 }).height - 8))}px`,
            transform: (() => {
              const { position: finalPos, alignment } = tooltipTransform;
              
              // For left/right positions (vertical middle alignment)
              if (finalPos === 'left') return 'translate(-100%, -50%)';
              if (finalPos === 'right') return 'translate(0, -50%)';
              
              // For top/bottom positions (horizontal alignment varies)
              if (finalPos === 'top') {
                if (alignment === 'left') return 'translate(0, -100%)';
                if (alignment === 'right') return 'translate(-100%, -100%)';
                return 'translate(-50%, -100%)'; // center
              }
              
              if (finalPos === 'bottom') {
                if (alignment === 'left') return 'translate(0, 0)';
                if (alignment === 'right') return 'translate(-100%, 0)';
                return 'translate(-50%, 0)'; // center
              }
              
              return 'translate(-50%, -50%)'; // fallback
            })(),
          }}
        >
          <div className="glass-panel rounded-xl sm:rounded-2xl p-3 sm:p-6 w-[90vw] sm:w-auto sm:max-w-sm shadow-2xl border-2 border-[var(--accent-cyan)]/30 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={handleSkip}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 text-white/50 hover:text-white transition-colors z-10"
              aria-label="Close tutorial"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>

            {/* Progress */}
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-[var(--accent-cyan)] uppercase tracking-wider">
                  Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
                </span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full arc-primary-gradient"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStepIndex + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Content */}
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 pr-6">
              {currentStep.title}
            </h3>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
              {currentStep.description}
            </p>
            
            {/* Debug info only in development */}
            {!spotlightRect && isDev && (
              <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
                <p className="text-yellow-400 text-xs">
                  ⚠️ Waiting for element: <code className="bg-black/30 px-1 rounded">{currentStep.targetSelector}</code>
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-white/60 hover:text-white transition-colors order-2 sm:order-1"
              >
                Skip Tutorial
              </button>

              <div className="flex gap-2 order-1 sm:order-2">
                {!isFirstStep && (
                  <button
                    onClick={handlePrevious}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-2"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2 arc-primary-gradient text-white text-sm rounded-lg font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2"
                >
                  {isLastStep ? 'Finish' : 'Next'}
                  {!isLastStep && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
