import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfYear, eachMonthOfInterval, endOfYear } from 'date-fns';
import { TimelineTask, TimelineMission } from './useTimelineData';
import { getTasksForDate } from './timelineUtils';

interface YearViewProps {
  currentDate: Date;
  tasks: TimelineTask[];
  missions: TimelineMission[];
  onMonthClick: (month: Date) => void;
}

export function YearView({ currentDate, tasks, missions, onMonthClick }: YearViewProps) {
  const year = currentDate.getFullYear();
  const months = useMemo(() => {
    const start = startOfYear(currentDate);
    const end = endOfYear(currentDate);
    return eachMonthOfInterval({ start, end });
  }, [currentDate]);

  const getMonthIntensity = (month: Date): number => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    
    const completedCount = days.reduce((acc, day) => {
      const dayTasks = getTasksForDate(tasks, day);
      return acc + dayTasks.filter(t => t.is_completed).length;
    }, 0);

    const totalCount = days.reduce((acc, day) => {
      const dayTasks = getTasksForDate(tasks, day);
      return acc + dayTasks.length;
    }, 0);

    if (totalCount === 0) return 0;
    return completedCount / totalCount;
  };

  const getIntensityColor = (intensity: number): string => {
    if (intensity === 0) return 'rgba(255, 255, 255, 0.05)';
    if (intensity < 0.25) return 'rgba(0, 224, 255, 0.2)';
    if (intensity < 0.5) return 'rgba(0, 224, 255, 0.4)';
    if (intensity < 0.75) return 'rgba(0, 224, 255, 0.6)';
    return 'rgba(0, 224, 255, 0.8)';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-2xl p-8 border border-white/10"
    >
      {/* Year header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">{year}</h2>
        <p className="text-sm text-white/70">
          Click any month to view details
        </p>
      </div>

      {/* Months grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
        {months.map((month, idx) => {
          const intensity = getMonthIntensity(month);
          const monthDays = eachDayOfInterval({
            start: startOfMonth(month),
            end: endOfMonth(month)
          });

          return (
            <motion.div
              key={month.toISOString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onMonthClick(month)}
              className="glass-panel rounded-xl p-4 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all border border-white/10"
              style={{
                background: `linear-gradient(135deg, ${getIntensityColor(intensity)}, rgba(255, 255, 255, 0.03))`
              }}
            >
              <div className="text-center mb-3">
                <div className="text-lg font-bold text-white mb-1">
                  {format(month, 'MMM')}
                </div>
                <div className="text-xs text-white/70">
                  {format(month, 'yyyy')}
                </div>
              </div>

              {/* Mini calendar heatmap */}
              <div className="grid grid-cols-7 gap-0.5">
                {monthDays.map(day => {
                  const dayTasks = getTasksForDate(tasks, day);
                  const completed = dayTasks.filter(t => t.is_completed).length;
                  const total = dayTasks.length;
                  const dayIntensity = total > 0 ? completed / total : 0;

                  return (
                    <div
                      key={day.toISOString()}
                      className="aspect-square rounded-sm"
                      style={{
                        backgroundColor: getIntensityColor(dayIntensity)
                      }}
                      title={`${format(day, 'MMM d')}: ${completed}/${total} tasks`}
                    />
                  );
                })}
              </div>

              {/* Stats */}
              <div className="mt-3 pt-3 border-t border-white/20 text-center">
                <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                  {Math.round(intensity * 100)}%
                </div>
                <div className="text-[10px] text-white/70">completion</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-8 flex items-center justify-center gap-6">
        <span className="text-xs text-white/70">Less</span>
        <div className="flex items-center gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((level, idx) => (
            <div
              key={idx}
              className="w-4 h-4 rounded-sm border border-white/20"
              style={{ backgroundColor: getIntensityColor(level) }}
            />
          ))}
        </div>
        <span className="text-xs text-white/70">More</span>
      </div>
    </motion.div>
  );
}

