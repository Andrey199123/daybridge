import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { TimelineTask, TimelineMission, TimelineMilestone } from './useTimelineData';

export const CATEGORY_COLORS: Record<string, string> = {
  'Academic': '#1FA2FF',
  'Career': '#00D4FF',
  'Creative': '#8A7CFF',
  'Entrepreneurial': '#FFA735',
  'Personal Growth': '#FF4FD8'
};

export function getTasksForDate(tasks: TimelineTask[], date: Date): TimelineTask[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  return tasks.filter(task => task.due_date === dateStr);
}

export function getMilestonesForDate(milestones: TimelineMilestone[], date: Date): TimelineMilestone[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  return milestones.filter(milestone => milestone.deadline === dateStr);
}

export function getTasksForDateRange(tasks: TimelineTask[], startDate: Date, endDate: Date): TimelineTask[] {
  return tasks.filter(task => {
    if (!task.due_date) return false;
    const taskDate = parseISO(task.due_date);
    return taskDate >= startOfDay(startDate) && taskDate <= startOfDay(endDate);
  });
}

export function groupTasksByDate(tasks: TimelineTask[]): Map<string, TimelineTask[]> {
  const grouped = new Map<string, TimelineTask[]>();
  
  tasks.forEach(task => {
    if (!task.due_date) return;
    const dateKey = task.due_date;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(task);
  });
  
  return grouped;
}

export function sortTasksByTime(tasks: TimelineTask[]): TimelineTask[] {
  return [...tasks].sort((a, b) => {
    // Prioritize tasks with scheduled times
    if (a.scheduled_time && !b.scheduled_time) return -1;
    if (!a.scheduled_time && b.scheduled_time) return 1;
    
    // Sort by scheduled time if both have it
    if (a.scheduled_time && b.scheduled_time) {
      return a.scheduled_time.localeCompare(b.scheduled_time);
    }
    
    // Sort by title if neither has time
    return a.title.localeCompare(b.title);
  });
}

export function hasTimeConflict(task1: TimelineTask, task2: TimelineTask): boolean {
  if (!task1.scheduled_time || !task2.scheduled_time) return false;
  if (!task1.due_date || !task2.due_date) return false;
  if (task1.due_date !== task2.due_date) return false;
  
  const duration1 = task1.duration_minutes || 30;
  const duration2 = task2.duration_minutes || 30;
  
  const [h1, m1] = task1.scheduled_time.split(':').map(Number);
  const [h2, m2] = task2.scheduled_time.split(':').map(Number);
  
  const start1 = h1 * 60 + m1;
  const end1 = start1 + duration1;
  const start2 = h2 * 60 + m2;
  const end2 = start2 + duration2;
  
  return (start1 < end2 && end1 > start2);
}

export function detectConflicts(tasks: TimelineTask[]): Set<string> {
  const conflicts = new Set<string>();
  
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      if (hasTimeConflict(tasks[i], tasks[j])) {
        conflicts.add(tasks[i].id);
        conflicts.add(tasks[j].id);
      }
    }
  }
  
  return conflicts;
}

// Returns a map of task ID -> array of conflicting task titles
export function detectConflictsWithDetails(tasks: TimelineTask[]): Map<string, string[]> {
  const conflictMap = new Map<string, string[]>();
  
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      if (hasTimeConflict(tasks[i], tasks[j])) {
        // Add task j to task i's conflicts
        if (!conflictMap.has(tasks[i].id)) {
          conflictMap.set(tasks[i].id, []);
        }
        conflictMap.get(tasks[i].id)!.push(tasks[j].title);
        
        // Add task i to task j's conflicts
        if (!conflictMap.has(tasks[j].id)) {
          conflictMap.set(tasks[j].id, []);
        }
        conflictMap.get(tasks[j].id)!.push(tasks[i].title);
      }
    }
  }
  
  return conflictMap;
}

export function calculateStreak(tasks: TimelineTask[], endDate: Date = new Date()): number {
  if (tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(t => t.is_completed && t.due_date);
  const dateMap = new Map<string, boolean>();
  
  completedTasks.forEach(task => {
    if (task.due_date) {
      dateMap.set(task.due_date, true);
    }
  });
  
  let streak = 0;
  let currentDate = startOfDay(endDate);
  
  while (true) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    if (!dateMap.has(dateStr)) break;
    streak++;
    currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return streak;
}

export function getMissionColor(mission: TimelineMission): string {
  return CATEGORY_COLORS[mission.category] || '#6C63FF';
}

export function formatTimeSlot(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function parseTimeSlot(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  let hour = parseInt(time);
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour;
}

