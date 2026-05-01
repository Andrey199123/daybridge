import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { TimelineTask, TimelineMission, TimelineMilestone } from './useTimelineData';
import { getTasksForDate, getMilestonesForDate, formatTimeSlot, detectConflicts, detectConflictsWithDetails } from './timelineUtils';
import { Clock, Plus, AlertCircle, Target } from 'lucide-react';
import { TaskCard } from './TaskCard';

interface DayViewProps {
  currentDate: Date;
  tasks: TimelineTask[];
  missions: TimelineMission[];
  milestones?: TimelineMilestone[];
  onTimeSlotClick: (date: Date, time: string) => void;
  onMilestoneClick?: (milestone: TimelineMilestone) => void;
  onTaskClick?: (task: TimelineTask, mission?: TimelineMission) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 80;

export function DayView({ currentDate, tasks, missions, milestones = [], onTimeSlotClick, onMilestoneClick, onTaskClick }: DayViewProps) {
  const dayTasks = useMemo(() => getTasksForDate(tasks, currentDate), [tasks, currentDate]);
  const dayMilestones = useMemo(() => getMilestonesForDate(milestones, currentDate), [milestones, currentDate]);
  const conflicts = useMemo(() => detectConflicts(dayTasks), [dayTasks]);
  const conflictDetails = useMemo(() => detectConflictsWithDetails(dayTasks), [dayTasks]);
  const gridRef = useRef<HTMLDivElement>(null);

  const scheduledTasks = dayTasks.filter(t => t.scheduled_time);
  const unscheduledTasks = dayTasks.filter(t => !t.scheduled_time);

  const getTasksForHour = (hour: number): TimelineTask[] => {
    return scheduledTasks.filter(task => {
      if (!task.scheduled_time) return false;
      const [taskHour] = task.scheduled_time.split(':').map(Number);
      const duration = task.duration_minutes || 30;
      const endHour = taskHour + Math.ceil(duration / 60);
      return hour >= taskHour && hour < endHour;
    });
  };

  const handleTimeSlotClick = (hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick(currentDate, timeStr);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Unscheduled tasks section */}
      {unscheduledTasks.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/40" />
            Unscheduled ({unscheduledTasks.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unscheduledTasks.map(task => {
              const mission = missions.find(m => m.id === task.mission_id);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  mission={mission}
                  hasConflict={false}
                  onClick={() => onTaskClick?.(task, mission)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduled timeline */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
        {/* Day header */}
        <div className="p-4 border-b border-white/20 bg-white/5">
          <div className="text-center">
            <div className="text-sm font-medium text-white/70 mb-1">
              {format(currentDate, 'EEEE')}
            </div>
            <div className="text-2xl font-bold text-white">
              {format(currentDate, 'MMMM d, yyyy')}
            </div>
            {/* Milestones for this day */}
            {dayMilestones.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {dayMilestones.map(milestone => (
                  <button
                    key={milestone.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMilestoneClick?.(milestone);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                  >
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-400 font-medium">
                      {milestone.title}
                    </span>
                    <span className="text-xs text-purple-400/60">
                      (Deadline)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div ref={gridRef} className="overflow-auto max-h-[700px]">
          <div className="flex">
            {/* Time labels */}
            <div className="w-24 border-r border-white/20 flex-shrink-0">
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="h-[80px] p-3 border-b border-white/15 text-right"
                >
                  <span className="text-sm text-white/70">
                    {formatTimeSlot(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* Schedule column */}
            <div className="flex-1 relative">
              {HOURS.map(hour => {
                const hourTasks = getTasksForHour(hour);
                const hasConflict = hourTasks.some(t => conflicts.has(t.id));

                return (
                  <div
                    key={hour}
                    className="h-[80px] border-b border-white/15 relative group hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => handleTimeSlotClick(hour)}
                  >
                    {/* Add button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-0">
                      <Plus className="w-5 h-5 text-white/60" />
                    </div>

                    {/* Tasks in this hour */}
                    <div className="absolute inset-0 p-2 pointer-events-none z-10">
                      {(() => {
                        // Group tasks that start in this hour
                        const tasksStartingThisHour = hourTasks.filter(task => 
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
                        
                        return tasksStartingThisHour.map((task, taskIndex) => {
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
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="absolute pointer-events-auto"
                              style={{ 
                                minHeight: `${height - 8}px`,
                                top: `${topOffset}px`,
                                left: overlapCount > 1 ? `calc(${leftPercent}% + 4px)` : '8px',
                                width: overlapCount > 1 ? `calc(${widthPercent}% - 4px)` : 'calc(100% - 16px)',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TaskCard
                                task={task}
                                mission={mission}
                                hasConflict={conflicts.has(task.id)}
                                conflictingTasks={conflictDetails.get(task.id) || []}
                                onClick={() => onTaskClick?.(task, mission)}
                                compact={overlapCount > 2}
                              />
                            </motion.div>
                          );
                        });
                      })()}
                    </div>

                    {/* Conflict indicator */}
                    {hasConflict && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                          <AlertCircle className="w-3 h-3 text-orange-400" />
                          <span className="text-xs text-orange-400 font-medium">Conflict</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

