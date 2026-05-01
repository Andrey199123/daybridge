import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format, addDays, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { DayTile } from "../timeline/DayTile";
import { useTimelineData } from "../timeline/useTimelineData";
import { useNavigate } from "react-router-dom";

export function MiniTimeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [focusedDayIndex, setFocusedDayIndex] = useState<number | null>(null);
  const { tasks, missions, loading } = useTimelineData();
  const navigate = useNavigate();
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);

  const today = new Date();
  const weekStart = addDays(startOfWeek(today), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const scrollLeft = () => {
    setWeekOffset(prev => prev - 1);
  };

  const scrollRight = () => {
    setWeekOffset(prev => prev + 1);
  };

  const goToToday = () => {
    setWeekOffset(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (focusedDayIndex === null) return;

      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedDayIndex(prev => Math.max(0, (prev || 0) - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedDayIndex(prev => Math.min(6, (prev || 0) + 1));
          break;
        case 'Enter':
          e.preventDefault();
          const day = days[focusedDayIndex];
          navigate(`/timeline?date=${day.toISOString()}`);
          break;
        case 'Escape':
          setFocusedDayIndex(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedDayIndex, days, navigate]);

  // Focus management
  useEffect(() => {
    if (focusedDayIndex !== null && dayRefs.current[focusedDayIndex]) {
      dayRefs.current[focusedDayIndex]?.focus();
    }
  }, [focusedDayIndex]);

  return (
    <motion.div
      className="glass-panel rounded-2xl p-6 mb-6 relative z-10"
      style={{ 
        overflow: 'visible',
        paddingTop: '28px',
        paddingBottom: '28px'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-0">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Calendar className="w-5 h-5 text-[var(--accent-cyan)]" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-white">Timeline</h2>
            <p className="text-xs text-white/60 mt-0.5">Your upcoming week</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={scrollLeft}
            className="p-2 glass-panel rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4 text-white/80" />
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-2 glass-panel rounded-lg hover:bg-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors"
          >
            Today
          </button>

          <button
            onClick={scrollRight}
            className="p-2 glass-panel rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4 text-white/80" />
          </button>

          <button
            onClick={() => navigate('/timeline')}
            className="ml-2 px-4 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-white text-xs font-medium rounded-lg transition-all shadow-lg shadow-[var(--accent-cyan)]/20"
          >
            View Full Timeline
          </button>
        </div>
      </div>

      {/* Timeline strip */}
      <div 
        ref={scrollRef}
        className="relative py-4"
        style={{ 
          overflow: 'visible',
          isolation: 'isolate',
          paddingTop: '24px',
          paddingBottom: '24px'
        }}
      >
        <div 
          className="grid gap-3 px-2"
          style={{
            gridTemplateColumns: 'repeat(7, 1fr)',
            minHeight: '160px',
            overflow: 'visible'
          }}
        >
          {days.map((day, index) => (
            <motion.div
              key={day.toISOString()}
              ref={(el) => (dayRefs.current[index] = el)}
              className="relative outline-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1,
                y: 0
              }}
              transition={{ delay: index * 0.05 }}
              tabIndex={0}
              role="button"
              aria-label={`View ${format(day, 'EEEE, MMMM d')}`}
              onFocus={() => setFocusedDayIndex(index)}
              onBlur={() => setFocusedDayIndex(null)}
              onClick={() => navigate(`/timeline?date=${day.toISOString()}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/timeline?date=${day.toISOString()}`);
                }
              }}
            >
              <DayTile
                date={day}
                tasks={tasks}
                missions={missions}
                onClick={() => {
                  const year = day.getFullYear();
                  const month = String(day.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(day.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${dayStr}`;
                  navigate(`/timeline?date=${dateStr}`);
                }}
                onNavigateToDay={(date) => {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(date.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${dayStr}`;
                  navigate(`/timeline?view=day&date=${dateStr}`);
                }}
                isCompact={false}
                showDate={true}
                isFocused={focusedDayIndex === index}
                className="h-full min-h-[140px]"
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Week indicator */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--accent-cyan)]/30 to-transparent pointer-events-none"
        style={{ zIndex: 0 }}
        animate={{
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.div>
  );
}

