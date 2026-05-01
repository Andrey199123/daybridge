import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface Goal {
  _id: Id<"goals">;
  userId: Id<"users">;
  title: string;
  description: string;
  category: string;
  status: "active" | "completed";
  priority: "high" | "medium" | "low";
  targetDate?: string;
  completedAt?: number;
  aiGenerated: boolean;
  progress: number;
  tasks: Task[];
}

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

export interface Milestone {
  _id: Id<"milestones">;
  goalId: Id<"goals">;
  userId: Id<"users">;
  title: string;
  deadline?: string;
  skills?: string[];
  status: "active" | "completed";
  order: number;
  tasksGenerated?: boolean;
}

export class GoalsService {
  // Queries
  static useList(status?: "active" | "completed") {
    return useQuery(api.goals.getUserGoals, { status });
  }

  static useGet(goalId: Id<"goals">) {
    return useQuery(api.goals.getGoal, { goalId });
  }

  static useGetWithMilestones(goalId: Id<"goals">) {
    return useQuery(api.goals.getGoalWithMilestones, { goalId });
  }

  static useSearch(query: string) {
    return useQuery(api.goals.searchGoals, { query });
  }

  static useSuggestions() {
    return useQuery(api.goals.getGoalSuggestions);
  }

  // Mutations
  static useCreate() {
    return useMutation(api.goals.createGoal);
  }

  static useCreateWithAI() {
    return useAction(api.goals.createGoalWithAI);
  }

  static useUpdate() {
    return useMutation(api.goals.updateGoal);
  }

  static useDelete() {
    return useMutation(api.goals.deleteGoal);
  }

  static useComplete() {
    return useMutation(api.goals.completeGoal);
  }

  static useDeleteCompleted() {
    return useMutation(api.goals.deleteCompletedGoals);
  }

  // Actions
  static useToggleTask() {
    return useAction(api.goals.toggleTask);
  }

  static useGenerateMilestones() {
    return useAction(api.goals.generateMilestones);
  }
}

