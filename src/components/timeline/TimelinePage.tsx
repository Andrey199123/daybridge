import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, isSameDay, isToday as checkIsToday, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Filter, X } from 'lucide-react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { YearView } from './YearView';
import { QuickAddModal } from './QuickAddModal';
import { MilestoneDetailModal } from './MilestoneDetailModal';
import { TaskDetailModal } from './TaskDetailModal';
import { useTimelineData, TimelineMilestone, TimelineTask, TimelineMission } from './useTimelineData';
import { useSearchParams } from 'react-router-dom';

type ViewMode = 'month' | 'week' | 'day' | 'year';

const CATEGORY_COLORS = {
  'Academic': '#1FA2FF',
  'Career': '#00D4FF',
  'Creative': '#8A7CFF',
  'Entrepreneurial': '#FFA735',
  'Personal Growth': '#FF4FD8'
};

export function TimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'month');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [quickAddTime, setQuickAddTime] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedMissions, setSelectedMissions] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<TimelineMilestone | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ task: TimelineTask; mission?: TimelineMission } | null>(null);
  
  const { missions, tasks, milestones, loading, error } = useTimelineData();

  // Sync view mode with URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('view', viewMode);
    // Format date as YYYY-MM-DD instead of ISO string
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    params.set('date', `${year}-${month}-${day}`);
    
    if (selectedCategories.size > 0) {
      params.set('categories', Array.from(selectedCategories).join(','));
    } else {
      params.delete('categories');
    }
    
    if (selectedMissions.size > 0) {
      params.set('missions', Array.from(selectedMissions).join(','));
    } else {
      params.delete('missions');
    }
    
    setSearchParams(params, { replace: true });
  }, [viewMode, currentDate, selectedCategories, selectedMissions]);

  // Sync state with URL parameters
  useEffect(() => {
    const view = searchParams.get('view') as ViewMode;
    const categories = searchParams.get('categories');
    const missions = searchParams.get('missions');
    const date = searchParams.get('date');
    
    // Update view mode if it changed
    if (view && view !== viewMode) {
      setViewMode(view);
    }
    
    if (categories) {
      const newCategories = new Set(categories.split(','));
      if (newCategories.size !== selectedCategories.size || 
          ![...newCategories].every(cat => selectedCategories.has(cat))) {
        setSelectedCategories(newCategories);
      }
    }
    
    if (missions) {
      const newMissions = new Set(missions.split(','));
      if (newMissions.size !== selectedMissions.size || 
          ![...newMissions].every(mission => selectedMissions.has(mission))) {
        setSelectedMissions(newMissions);
      }
    }
    
    if (date) {
      // Only parse if it's a valid YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        try {
          const [year, month, day] = date.split('-').map(Number);
          const parsedDate = new Date(year, month - 1, day);
          
          // Only update if the date is different
          if (!isNaN(parsedDate.getTime()) && 
              parsedDate.getFullYear() === year && 
              parsedDate.getMonth() === month - 1 && 
              parsedDate.getDate() === day &&
              parsedDate.getTime() !== currentDate.getTime()) {
            setCurrentDate(parsedDate);
          }
        } catch (error) {
          console.warn('Error parsing date from URL:', date, error);
        }
      } else {
        console.warn('Invalid date format in URL (expected YYYY-MM-DD):', date);
      }
    }
  }, [searchParams.toString()]); // Use toString() to avoid object reference issues

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextArea) return;

      switch(e.key.toLowerCase()) {
        case 'm':
          setViewMode('month');
          break;
        case 'w':
          setViewMode('week');
          break;
        case 'd':
          setViewMode('day');
          break;
        case 'y':
          setViewMode('year');
          break;
        case 't':
          setCurrentDate(new Date());
          break;
        case 'arrowleft':
          handlePrevious();
          break;
        case 'arrowright':
          handleNext();
          break;
      }
      
      if (e.key === 'PageUp') {
        e.preventDefault();
        handlePrevious();
      }
      if (e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  const handlePrevious = () => {
    switch(viewMode) {
      case 'month':
        setCurrentDate(prev => subMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => subWeeks(prev, 1));
        break;
      case 'day':
        setCurrentDate(prev => subDays(prev, 1));
        break;
      case 'year':
        setCurrentDate(prev => new Date(prev.getFullYear() - 1, 0, 1));
        break;
    }
  };

  const handleNext = () => {
    switch(viewMode) {
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, 1));
        break;
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
      case 'year':
        setCurrentDate(prev => new Date(prev.getFullYear() + 1, 0, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const dateRangeTitle = useMemo(() => {
    // Safety check for invalid dates
    if (!currentDate || isNaN(currentDate.getTime())) {
      return 'Invalid Date';
    }
    
    switch(viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'year':
        return format(currentDate, 'yyyy');
    }
  }, [currentDate, viewMode]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (selectedCategories.size > 0) {
        const mission = missions.find(m => m.id === task.mission_id);
        if (!mission || !selectedCategories.has(mission.category)) return false;
      }
      if (selectedMissions.size > 0 && !selectedMissions.has(task.mission_id)) {
        return false;
      }
      return true;
    });
  }, [tasks, missions, selectedCategories, selectedMissions]);

  const handleQuickAdd = (date: Date, time?: string) => {
    setQuickAddDate(date);
    setQuickAddTime(time || null);
    setShowQuickAdd(true);
  };

  const handleNavigateToDay = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', 'day');
      newParams.set('date', dateStr);
      return newParams;
    });
  };

  const handleTaskClick = (task: TimelineTask, mission?: TimelineMission) => {
    setSelectedTask({ task, mission });
  };

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedCategories(new Set());
    setSelectedMissions(new Set());
  };

  const uniqueCategories = Array.from(new Set(missions.map(m => m.category)));

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-6 mb-6 border border-white/10"
      >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <CalendarIcon className="w-6 h-6 text-[var(--accent-cyan)]" />
              <div>
                <h1 className="text-2xl font-bold text-white">Timeline</h1>
                <p className="text-sm text-white/80">{dateRangeTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View Switcher */}
              <div className="glass-panel rounded-lg p-1 flex gap-1">
                {['month', 'week', 'day', 'year'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as ViewMode)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      viewMode === mode
                        ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="glass-panel rounded-lg p-1 flex gap-1">
                <button
                  onClick={handlePrevious}
                  className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-3 py-2 rounded hover:bg-white/10 text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`glass-panel rounded-lg p-2 hover:bg-white/10 transition-colors ${
                  selectedCategories.size > 0 || selectedMissions.size > 0 ? 'text-[var(--accent-cyan)]' : 'text-white/80'
                }`}
                aria-label="Toggle filters"
              >
                <Filter className="w-4 h-4" />
              </button>

              {/* Add Button */}
              <button
                onClick={() => handleQuickAdd(currentDate)}
                className="bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-[var(--accent-cyan)]/20"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">Filters</span>
                    {(selectedCategories.size > 0 || selectedMissions.size > 0) && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-white/60 hover:text-white flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear all
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {uniqueCategories.map(category => (
                      <button
                        key={category}
                        onClick={() => toggleCategoryFilter(category)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          selectedCategories.has(category)
                            ? 'text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                        style={selectedCategories.has(category) ? {
                          backgroundColor: `${CATEGORY_COLORS[category]}40`,
                          color: CATEGORY_COLORS[category]
                        } : {}}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Calendar Views */}
      <AnimatePresence mode="wait">
          {viewMode === 'month' && (
            <MonthView
              key="month"
              currentDate={currentDate}
              tasks={filteredTasks}
              missions={missions}
              milestones={milestones}
              onDateClick={handleQuickAdd}
              onNavigateToDay={handleNavigateToDay}
              onMilestoneClick={setSelectedMilestone}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              key="week"
              currentDate={currentDate}
              tasks={filteredTasks}
              missions={missions}
              milestones={milestones}
              onTimeSlotClick={handleQuickAdd}
              onMilestoneClick={setSelectedMilestone}
              onTaskClick={handleTaskClick}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              key="day"
              currentDate={currentDate}
              tasks={filteredTasks}
              missions={missions}
              milestones={milestones}
              onTimeSlotClick={handleQuickAdd}
              onMilestoneClick={setSelectedMilestone}
              onTaskClick={handleTaskClick}
            />
          )}
        {viewMode === 'year' && (
          <YearView
            key="year"
            currentDate={currentDate}
            tasks={filteredTasks}
            missions={missions}
            onMonthClick={(month) => {
              setCurrentDate(month);
              setViewMode('month');
            }}
          />
        )}
      </AnimatePresence>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAddModal
          date={quickAddDate!}
          time={quickAddTime}
          missions={missions}
          onClose={() => {
            setShowQuickAdd(false);
            setQuickAddDate(null);
            setQuickAddTime(null);
          }}
        />
      )}

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <MilestoneDetailModal
          milestone={selectedMilestone}
          missions={missions}
          onClose={() => setSelectedMilestone(null)}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask.task}
          mission={selectedTask.mission}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

