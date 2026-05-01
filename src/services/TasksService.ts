import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface Task {
  _id: Id<"tasks">;
  goalId: Id<"goals">;
  milestoneId?: Id<"milestones">;
  userId: Id<"users">;
  title: string;
  description?: string;
  completed: boolean;
  order: number;
  completedAt?: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface TaskWithGoalInfo extends Task {
  goalTitle: string;
  goalCategory: string;
}

export class TasksService {
  // Queries
  static useGet(taskId: Id<"tasks">) {
    return useQuery(api.tasks.getTask, { taskId });
  }

  static useGetForGoal(goalId: Id<"goals">) {
    return useQuery(api.tasks.getTasksForGoal, { goalId });
  }

  static useGetForMilestone(milestoneId: Id<"milestones">) {
    return useQuery(api.tasks.getTasksForMilestone, { milestoneId });
  }

  static useGetTodays() {
    return useQuery(api.tasks.getTodaysTasks);
  }

  static useGetScheduled(goalId: Id<"goals">) {
    return useQuery(api.tasks.getScheduledTasksForGoal, { goalId });
  }

  static useGetUnscheduled(goalId: Id<"goals">) {
    return useQuery(api.tasks.getUnscheduledTasksForGoal, { goalId });
  }

  static useGetScheduledSummary(goalId: Id<"goals">) {
    return useQuery(api.tasks.getScheduledTasksSummary, { goalId });
  }

  static useGetAll() {
    return useQuery(api.tasks.getAllUserTasks);
  }

  // Mutations
  static useCreate() {
    return useMutation(api.tasks.createTask);
  }

  static useCreateWithDetails() {
    return useMutation(api.tasks.createTaskWithDetails);
  }

  static useUpdate() {
    return useMutation(api.tasks.updateTask);
  }

  // Actions
  static useToggle() {
    return useAction(api.goals.toggleTask);
  }
}

