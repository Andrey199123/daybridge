import { useMemo } from 'react';
import { GoalsService, TasksService, MilestonesService } from '../../services';

export interface TimelineTask {
  id: string;
  mission_id: string;
  milestone_id?: string;
  title: string;
  description?: string;
  is_completed: boolean;
  due_date?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  priority: string;
  category?: string;
}

export interface TimelineMission {
  id: string;
  name: string;
  category: string;
  percent_complete: number;
  priority: string;
  deadline?: string;
  status: string;
}

export interface TimelineMilestone {
  id: string;
  mission_id: string;
  title: string;
  deadline?: string;
  status: string;
  order: number;
}

export function useTimelineData() {
  const activeGoals = GoalsService.useList('active');
  const completedGoals = GoalsService.useList('completed');
  const allMilestones = MilestonesService.useGetAll();

  const missions = useMemo(() => {
    const allGoals = [...(activeGoals || []), ...(completedGoals || [])];
    return allGoals.map(goal => ({
      id: goal._id,
      name: goal.title,
      category: goal.category,
      percent_complete: goal.progress || 0,
      priority: goal.priority,
      deadline: goal.targetDate,
      status: goal.status
    }));
  }, [activeGoals, completedGoals]);

  const tasks = useMemo(() => {
    const allGoals = [...(activeGoals || []), ...(completedGoals || [])];
    const allTasks: TimelineTask[] = [];

    allGoals.forEach(goal => {
      (goal.tasks || []).forEach(task => {
        allTasks.push({
          id: task._id,
          mission_id: goal._id,
          milestone_id: task.milestoneId,
          title: task.title,
          description: task.description,
          is_completed: task.completed,
          due_date: task.scheduledDate,
          scheduled_time: task.scheduledTime,
          duration_minutes: task.durationMinutes || 45, // Use actual duration from DB, default to 45 if not set
          priority: goal.priority,
          category: goal.category
        });
      });
    });

    return allTasks;
  }, [activeGoals, completedGoals]);

  const milestones: TimelineMilestone[] = useMemo(() => {
    return (allMilestones || []).map(m => ({
      id: m._id,
      mission_id: m.goalId,
      title: m.title,
      deadline: m.deadline,
      status: m.status,
      order: m.order
    }));
  }, [allMilestones]);

  return {
    missions,
    tasks,
    milestones,
    loading: !activeGoals && !completedGoals,
    error: null
  };
}

