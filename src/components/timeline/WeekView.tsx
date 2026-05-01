import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';
import { TimelineTask, TimelineMission, TimelineMilestone } from './useTimelineData';
import { getTasksForDate, getMilestonesForDate, CATEGORY_COLORS, formatTimeSlot, detectConflicts, detectConflictsWithDetails } from './timelineUtils';
import { Clock, Plus, AlertCircle, Target } from 'lucide-react';
import { TaskCard } from './TaskCard';

interface WeekViewProps {
  currentDate: Date;
  tasks: TimelineTask[];
  missions: TimelineMission[];
  milestones?: TimelineMilestone[];
  onTimeSlotClick: (date: Date, time: string) => void;
  onMilestoneClick?: (milestone: TimelineMilestone) => void;
  onTaskClick?: (task: TimelineTask, mission?: TimelineMission) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;

export function WeekView({ currentDate, tasks, missions, milestones = [], onTimeSlotClick, onMilestoneClick, onTaskClick }: WeekViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const conflicts = useMemo(() => detectConflicts(tasks), [tasks]);
  const conflictDetails = useMemo(() => detectConflictsWithDetails(tasks), [tasks]);
  const gridRef = useRef<HTMLDivElement>(null);

  const getTasksForTimeSlot = (date: Date, hour: number): TimelineTask[] => {
    const dayTasks = getTasksForDate(tasks, date);
    return dayTasks.filter(task => {
      if (!task.scheduled_time) return false;
      const [taskHour] = task.scheduled_time.split(':').map(Number);
      const duration = task.duration_minutes || 30;
      const endHour = taskHour + Math.ceil(duration / 60);
      return hour >= taskHour && hour < endHour;
    });
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick(date, timeStr);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
    >
      {/* Week header */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-white/20 bg-white/5 sticky top-0 z-20">
        <div className="p-3 border-r border-white/20">
          <Clock className="w-4 h-4 text-white/60 mx-auto" />
        </div>
        {weekDays.map(date => {
          const dayMilestones = getMilestonesForDate(milestones, date);
          return (
            <div key={date.toISOString()} className="p-3 text-center border-r border-white/20 last:border-r-0">
              <div className="text-xs font-medium text-white/60 mb-1">
                {format(date, 'EEE')}
              </div>
              <div className="text-lg font-bold text-white">
                {format(date, 'd')}
              </div>
              <div className="text-[10px] text-white/40">
                {format(date, 'MMM')}
              </div>
              {/* Milestones for this day */}
              {dayMilestones.length > 0 && (
                <div className="mt-2 space-y-1">
                  {dayMilestones.slice(0, 2).map(milestone => (
                    <button
                      key={milestone.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMilestoneClick?.(milestone);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-colors w-full"
                    >
                      <Target className="w-3 h-3 text-purple-400" />
                      <span className="text-[9px] text-purple-400 font-medium truncate">
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
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={gridRef} className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-[80px_repeat(7,1fr)]">
          {/* Time labels column */}
          <div className="border-r border-white/20">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="h-[60px] p-2 border-b border-white/15 text-right"
              >
                <span className="text-xs text-white/70">
                  {formatTimeSlot(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(date => (
            <div key={date.toISOString()} className="border-r border-white/15 last:border-r-0 relative">
              {HOURS.map(hour => {
                const slotTasks = getTasksForTimeSlot(date, hour);
                const hasConflict = slotTasks.some(t => conflicts.has(t.id));

                return (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-white/15 relative group hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => handleTimeSlotClick(date, hour)}
                  >
                    {/* Add button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-0">
                      <Plus className="w-4 h-4 text-white/60" />
                    </div>

                    {/* Tasks in this slot */}
                    <div className="absolute inset-0 p-1 overflow-hidden pointer-events-none z-10">
                      {(() => {
                        // Get tasks that start in this hour
                        const tasksStartingThisHour = slotTasks.filter(task => 
                          task.scheduled_time?.startsWith(hour.toString().padStart(2, '0'))
                        );
                        
                        // Calculate overlapping groups
                        const getOverlappingTasks = (task: TimelineTask) => {
                          const [taskHour, taskMin] = (task.scheduled_time || '00:00').split(':').map(Number);
                          const taskStart = taskHour * 60 + taskMin;
                          const taskEnd = taskStart + (task.duration_minutes || 30);
                          
                          return tasksStartingThisHour.filter(other => {
                            if (other.id === task.id) return true;
                            const [otherHour, otherMin] = (other.scheduled_time || '00:00').split(':').map(Number);
                            const otherStart = otherHour * 60 + otherMin;
                            const otherEnd = otherStart + (other.duration_minutes || 30);
                            return taskStart < otherEnd && taskEnd > otherStart;
                          });
                        };
                        
                        return tasksStartingThisHour.map((task) => {
                          const mission = missions.find(m => m.id === task.mission_id);
                          const duration = task.duration_minutes || 30;
                          const height = (duration / 60) * HOUR_HEIGHT;
                          
                          // Calculate top offset based on minutes
                          const [, minutes] = (task.scheduled_time || '00:00').split(':').map(Number);
                          const topOffset = (minutes / 60) * HOUR_HEIGHT;
                          
                          // Calculate horizontal position for overlapping tasks
                          const overlapping = getOverlappingTasks(task);
                          const overlapIndex = overlapping.findIndex(t => t.id === task.id);
                          const overlapCount = overlapping.length;
                          
                          // Calculate width and left position
                          const widthPercent = overlapCount > 1 ? (100 / overlapCount) - 2 : 100;
                          const leftPercent = overlapCount > 1 ? (overlapIndex * (100 / overlapCount)) + 1 : 0;

                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute pointer-events-auto"
                              style={{ 
                                minHeight: `${height - 4}px`,
                                top: `${topOffset}px`,
                                left: overlapCount > 1 ? `calc(${leftPercent}% + 2px)` : '4px',
                                width: overlapCount > 1 ? `calc(${widthPercent}% - 2px)` : 'calc(100% - 8px)',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TaskCard
                                task={task}
                                mission={mission}
                                hasConflict={conflicts.has(task.id)}
                                conflictingTasks={conflictDetails.get(task.id) || []}
                                compact
                                onClick={() => onTaskClick?.(task, mission)}
                              />
                            </motion.div>
                          );
                        });
                      })()}
                    </div>

                    {/* Conflict indicator */}
                    {hasConflict && (
                      <div className="absolute top-1 right-1">
                        <AlertCircle className="w-3 h-3 text-orange-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

