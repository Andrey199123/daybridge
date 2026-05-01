import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isSameDay } from 'date-fns';
import { TimelineTask, TimelineMission, TimelineMilestone } from './useTimelineData';
import { getTasksForDate, getMilestonesForDate, CATEGORY_COLORS, detectConflicts } from './timelineUtils';
import { CheckCircle2, Circle, Clock, AlertCircle, Target } from 'lucide-react';
import { matchesMediaQuery } from '../../lib/browser';

interface DayTileProps {
  date: Date;
  tasks: TimelineTask[];
  missions: TimelineMission[];
  milestones?: TimelineMilestone[];
  onClick?: () => void;
  onNavigateToDay?: (date: Date) => void;
  onMilestoneClick?: (milestone: TimelineMilestone) => void;
  isCompact?: boolean;
  showDate?: boolean;
  isFocused?: boolean;
  className?: string;
}

export function DayTile({ date, tasks, missions, milestones = [], onClick, onNavigateToDay, onMilestoneClick, isCompact = false, showDate = true, isFocused = false, className = '' }: DayTileProps) {
  const dayTasks = useMemo(() => getTasksForDate(tasks, date), [tasks, date]);
  const dayMilestones = useMemo(() => getMilestonesForDate(milestones, date), [milestones, date]);
  const today = isToday(date);
  const conflicts = useMemo(() => detectConflicts(dayTasks), [dayTasks]);
  
  const completedTaskCount = dayTasks.filter(t => t.is_completed).length;
  const totalTaskCount = dayTasks.length;
  const completedMilestoneCount = dayMilestones.filter(m => m.status === 'completed').length;
  const totalMilestoneCount = dayMilestones.length;
  
  // Show combined counts: tasks + milestones
  const completedCount = completedTaskCount + completedMilestoneCount;
  const totalCount = totalTaskCount + totalMilestoneCount;
  const hasConflicts = conflicts.size > 0;

  const categoryDots = useMemo(() => {
    const categories = new Set<string>();
    dayTasks.slice(0, 3).forEach(task => {
      const mission = missions.find(m => m.id === task.mission_id);
      if (mission) categories.add(mission.category);
    });
    return Array.from(categories);
  }, [dayTasks, missions]);

  const prefersReducedMotion = matchesMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <motion.div
      onClick={onClick}
      className={`glass-panel rounded-xl relative ${
        today ? 'ring-2 ring-[var(--accent-cyan)]/50' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${
        isFocused ? 'ring-2 ring-[var(--accent-cyan)] ring-offset-2 ring-offset-[var(--bg-space-900)]' : ''
      } ${className}`}
      style={{
        background: today 
          ? 'linear-gradient(135deg, rgba(0, 224, 255, 0.1) 0%, rgba(0, 224, 255, 0.05) 100%)'
          : 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(12px)',
        border: today || isFocused ? '1px solid rgba(0, 224, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
        transformOrigin: 'center center',
        willChange: 'transform, box-shadow',
        overflow: 'visible',
        isolation: 'isolate',
      }}
      whileHover={onClick ? { 
        scale: 1.03,
        y: -4,
        zIndex: 20,
        transition: { duration: 0.2, ease: 'easeOut' }
      } : {}}
      animate={isFocused ? {
        opacity: 1,
        scale: 1.03,
        y: -4,
        zIndex: 20,
        boxShadow: [
          '0 8px 24px rgba(0, 224, 255, 0.2), 0 4px 12px rgba(108, 99, 255, 0.15)',
          '0 12px 32px rgba(0, 224, 255, 0.25), 0 6px 16px rgba(108, 99, 255, 0.2)',
          '0 8px 24px rgba(0, 224, 255, 0.2), 0 4px 12px rgba(108, 99, 255, 0.15)'
        ],
        transition: { 
          boxShadow: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 0.2 },
          y: { duration: 0.2 }
        }
      } : {
        opacity: 1,
        scale: 1,
        y: 0,
        zIndex: 1,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
      initial={{ opacity: 0, y: 10 }}
    >
      {/* Today pulse indicator */}
      {today && !prefersReducedMotion && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent-cyan)] rounded-full pointer-events-none"
          style={{ zIndex: 30 }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.5, 1]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className={isCompact ? 'p-2' : 'p-3'}>
        {/* Date header */}
        {showDate && (
          <div className="text-center mb-2">
            <div className={`text-xs font-medium mb-0.5 ${
              today ? 'text-[var(--accent-cyan)]' : 'text-white/60'
            }`}>
              {format(date, 'EEE')}
            </div>
            <div className={`font-bold ${
              today ? 'text-2xl text-[var(--accent-cyan)]' : 'text-xl text-white'
            }`}>
              {format(date, 'd')}
            </div>
            {!isCompact && (
              <div className="text-[10px] text-white/40 mt-0.5">
                {format(date, 'MMM')}
              </div>
            )}
          </div>
        )}

        {/* Task indicators */}
        {(totalTaskCount > 0 || dayMilestones.length > 0) ? (
          <div className="space-y-1.5">
            {/* Milestone indicators */}
            {dayMilestones.length > 0 && (
              <div className="flex flex-col items-center gap-1 mb-1">
                {dayMilestones.slice(0, 2).map(milestone => (
                  <button
                    key={milestone.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMilestoneClick?.(milestone);
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                  >
                    <Target className="w-2.5 h-2.5 text-purple-400" />
                    <span className="text-[8px] text-purple-400 font-medium truncate max-w-[60px]">
                      {milestone.title}
                    </span>
                  </button>
                ))}
                {dayMilestones.length > 2 && (
                  <span className="text-[8px] text-purple-400/60">
                    +{dayMilestones.length - 2} more
                  </span>
                )}
              </div>
            )}

            {/* Category dots */}
            {categoryDots.length > 0 && (
              <div className="flex justify-center gap-1">
                {categoryDots.map(category => (
                  <div
                    key={category}
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: CATEGORY_COLORS[category] || '#6C63FF',
                      boxShadow: `0 0 8px ${CATEGORY_COLORS[category] || '#6C63FF'}40`
                    }}
                  />
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[8px] text-white/40 ml-1">
                    +{dayTasks.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* Progress indicator */}
            {!isCompact && totalCount > 0 && (
              <div className="flex items-center justify-center gap-1 text-[10px]">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <span className="text-green-400 font-medium">{completedCount}</span>
                <span className="text-white/40">/</span>
                <span className="text-white/60">{totalCount}</span>
              </div>
            )}

            {/* View button for dates with tasks */}
            {totalTaskCount > 0 && !isCompact && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateToDay) {
                      onNavigateToDay(date);
                    }
                  }}
                  className="px-2 py-1 text-[10px] font-medium text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 hover:bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/30 rounded-full transition-all hover:scale-105"
                >
                  View
                </button>
              </div>
            )}

            {/* Conflict badge */}
            {hasConflicts && (
              <div className="flex justify-center">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
                  <AlertCircle className="w-2.5 h-2.5 text-orange-400" />
                  <span className="text-[8px] text-orange-400 font-medium">Conflict</span>
                </div>
              </div>
            )}

            {/* Task preview (compact mode) */}
            {isCompact && totalTaskCount > 0 && (
              <div className="text-center">
                <div className="text-xs text-white/80 font-medium">{totalTaskCount}</div>
                <div className="text-[8px] text-white/40">task{totalTaskCount !== 1 ? 's' : ''}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
