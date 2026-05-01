import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { TimelineTask, TimelineMission, TimelineMilestone } from './useTimelineData';
import { DayTile } from './DayTile';
import { TaskPopover } from './TaskPopover';
import { getTasksForDate } from './timelineUtils';

interface MonthViewProps {
  currentDate: Date;
  tasks: TimelineTask[];
  missions: TimelineMission[];
  milestones?: TimelineMilestone[];
  onDateClick: (date: Date) => void;
  onNavigateToDay?: (date: Date) => void;
  onMilestoneClick?: (milestone: TimelineMilestone) => void;
}

export function MonthView({ currentDate, tasks, missions, milestones = [], onDateClick, onNavigateToDay, onMilestoneClick }: MonthViewProps) {
  const [popoverDate, setPopoverDate] = useState<Date | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weeks = useMemo(() => {
    const weeksArray: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      weeksArray.push(monthDays.slice(i, i + 7));
    }
    return weeksArray;
  }, [monthDays]);

  const handleDayClick = (date: Date, event: React.MouseEvent) => {
    const dayTasks = getTasksForDate(tasks, date);
    
    if (dayTasks.length > 3) {
      // Show popover for days with many tasks
      const rect = event.currentTarget.getBoundingClientRect();
      setPopoverPosition({ x: rect.left, y: rect.bottom + 8 });
      setPopoverDate(date);
    } else {
      // Quick add for days with few tasks
      onDateClick(date);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-2xl p-6 border border-white/10"
    >
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-white/80 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-2">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-2">
            {week.map(date => {
              const isCurrentMonth = isSameMonth(date, currentDate);
              return (
                <div
                  key={date.toISOString()}
                  onClick={(e) => handleDayClick(date, e)}
                  className="relative"
                  style={{ minHeight: '120px' }}
                >
                  <DayTile
                    date={date}
                    tasks={tasks}
                    missions={missions}
                    milestones={milestones}
                    onClick={() => {}}
                    onNavigateToDay={onNavigateToDay}
                    onMilestoneClick={onMilestoneClick}
                    className={!isCurrentMonth ? 'opacity-40' : ''}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Task Popover */}
      {popoverDate && (
        <TaskPopover
          date={popoverDate}
          tasks={getTasksForDate(tasks, popoverDate)}
          missions={missions}
          position={popoverPosition}
          onClose={() => setPopoverDate(null)}
          onAddTask={() => {
            onDateClick(popoverDate);
            setPopoverDate(null);
          }}
        />
      )}
    </motion.div>
  );
}

