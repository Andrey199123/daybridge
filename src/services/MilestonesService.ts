import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

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

export class MilestonesService {
  // Queries
  static useGet(milestoneId: Id<"milestones">) {
    return useQuery(api.milestones.getMilestone, { milestoneId });
  }

  static useGetForGoal(goalId: Id<"goals">) {
    return useQuery(api.milestones.getMilestonesForGoal, { goalId });
  }

  static useGetCurrent() {
    return useQuery(api.milestones.getCurrentMilestone);
  }

  static useGetAll() {
    return useQuery(api.milestones.getAllUserMilestones);
  }

  // Mutations
  static useCreate() {
    return useMutation(api.milestones.createMilestone);
  }

  static useComplete() {
    return useMutation(api.milestones.completeMilestone);
  }

  static useUpdateDeadline() {
    return useMutation(api.milestones.updateMilestoneDeadline);
  }

  static useMarkTasksAsGenerated() {
    return useMutation(api.milestones.markTasksAsGenerated);
  }

  // Actions
  static useGenerateTasks() {
    return useAction(api.milestones.generateTasksForMilestone);
  }
}

